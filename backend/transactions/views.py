from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from django.db.models import Sum
from rest_framework import status, generics, permissions
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from decimal import Decimal
from datetime import date
from .models import Transaction, UserProfile
from .serializers import RegisterSerializer, UserSerializer, TransactionSerializer, UserProfileSerializer
from django.shortcuts import render


# ── Auth API Views ────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def register(request):
    serializer = RegisterSerializer(data=request.data)
    if serializer.is_valid():
        user     = serializer.save()
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([permissions.AllowAny])
def login(request):
    identifier = request.data.get('username') or request.data.get('email') or ''
    password   = request.data.get('password', '')

    if not identifier or not password:
        return Response({'error': 'Please provide username/email and password.'}, status=status.HTTP_400_BAD_REQUEST)

    if '@' in identifier:
        try:
            identifier = User.objects.get(email__iexact=identifier).username
        except User.DoesNotExist:
            return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)

    user = authenticate(username=identifier, password=password)
    if user:
        token, _ = Token.objects.get_or_create(user=user)
        return Response({'token': token.key, 'user': UserSerializer(user).data})
    return Response({'error': 'Invalid credentials'}, status=status.HTTP_401_UNAUTHORIZED)


@api_view(['POST'])
def logout(request):
    try:
        request.user.auth_token.delete()
    except Exception:
        pass
    return Response({'message': 'Logged out successfully'})


@api_view(['GET'])
def me(request):
    return Response(UserSerializer(request.user).data)

@api_view(['GET', 'PATCH'])
def currency(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if request.method == 'PATCH':
        serializer = UserProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    return Response(UserProfileSerializer(profile).data)


# ── Dashboard API ─────────────────────────────────────────────

@api_view(['GET'])
def dashboard(request):
    user  = request.user
    today = date.today()

    monthly = Transaction.objects.filter(
        user=user, date__year=today.year, date__month=today.month
    )
    total_income   = monthly.filter(type='income').aggregate(t=Sum('amount'))['t'] or Decimal('0')
    total_expenses = monthly.filter(type='expense').aggregate(t=Sum('amount'))['t'] or Decimal('0')
    recent         = monthly.order_by('-date')[:5]

    return Response({
        'total_income':        total_income,
        'total_expenses':      total_expenses,
        'balance':             total_income - total_expenses,
        'transaction_count':   monthly.count(),
        'recent_transactions': TransactionSerializer(recent, many=True).data,
    })


# ── Analytics API ─────────────────────────────────────────────

@api_view(['GET'])
def analytics(request):
    user             = request.user
    all_transactions = Transaction.objects.filter(user=user)
    months           = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    monthly_data     = {}

    for t in all_transactions:
        key = t.date.strftime('%b')
        if key not in monthly_data:
            monthly_data[key] = {'income': Decimal('0'), 'expense': Decimal('0')}
        monthly_data[key][t.type] += t.amount

    category_totals = {}
    for t in all_transactions:
        if t.category not in category_totals:
            category_totals[t.category] = {'income': 0, 'expense': 0}
        category_totals[t.category][t.type] += float(t.amount)

    expense_qs  = all_transactions.filter(type='expense')
    exp_total   = expense_qs.aggregate(s=Sum('amount'))['s'] or Decimal('1')
    exp_pie     = {}
    for t in expense_qs:
        exp_pie[t.category] = exp_pie.get(t.category, Decimal('0')) + t.amount

    income_qs  = all_transactions.filter(type='income')
    inc_total  = income_qs.aggregate(s=Sum('amount'))['s'] or Decimal('1')
    inc_pie    = {}
    for t in income_qs:
        inc_pie[t.category] = inc_pie.get(t.category, Decimal('0')) + t.amount

    return Response({
        'monthly_labels':       months,
        'monthly_income':       [float(monthly_data.get(m, {}).get('income', 0))  for m in months],
        'monthly_expenses':     [float(monthly_data.get(m, {}).get('expense', 0)) for m in months],
        'category_breakdown':   category_totals,
        'expense_distribution': {c: round(float(a/exp_total*100),1) for c,a in exp_pie.items()},
        'income_distribution':  {c: round(float(a/inc_total*100),1) for c,a in inc_pie.items()},
    })


# ── Transaction CRUD ──────────────────────────────────────────

class TransactionListCreateView(generics.ListCreateAPIView):
    serializer_class   = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        qs = Transaction.objects.filter(user=self.request.user).order_by('-date')
        search = self.request.query_params.get('search')
        ttype  = self.request.query_params.get('type')
        if search: qs = qs.filter(category__icontains=search) | qs.filter(title__icontains=search)
        if ttype:  qs = qs.filter(type=ttype)
        return qs

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class TransactionDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = TransactionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Transaction.objects.filter(user=self.request.user)


# ── HTML Page Views ───────────────────────────────────────────


def login_page(request):
    return render(request, 'index.html')

def dashboard_page(request):
    return render(request, 'dashboard.html')

def transactions_page(request):
    return render(request, 'transactions.html')

def analytics_page(request):
    return render(request, 'analytics.html')

# Create your views here.
