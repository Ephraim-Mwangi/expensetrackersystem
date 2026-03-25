from django.urls import path
from . import views

urlpatterns = [
    # ── Auth API ──────────────────────────────────────────────
    path('auth/register/', views.register, name='register'),
    path('auth/login/',    views.login,    name='api-login'),
    path('auth/logout/',   views.logout,   name='logout'),
    path('auth/me/',       views.me,       name='me'),

    # ── Dashboard & Analytics API ─────────────────────────────
    path('dashboard/',  views.dashboard,  name='dashboard-api'),
    path('analytics/',  views.analytics,  name='analytics-api'),

    # ── Transactions API ──────────────────────────────────────
    path('transactions/',          views.TransactionListCreateView.as_view(), name='transaction-list'),
    path('transactions/<int:pk>/', views.TransactionDetailView.as_view(),    name='transaction-detail'),
]