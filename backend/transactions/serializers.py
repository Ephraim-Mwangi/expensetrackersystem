from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Transaction, UserProfile


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model  = UserProfile
        fields = ['currency']


class UserSerializer(serializers.ModelSerializer):
    full_name     = serializers.SerializerMethodField()
    avatar_letter = serializers.SerializerMethodField()
    currency      = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'full_name', 'avatar_letter', 'currency']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_avatar_letter(self, obj):
        return (obj.first_name or obj.username or 'U')[0].upper()

    def get_currency(self, obj):
        profile, _ = UserProfile.objects.get_or_create(user=obj)
        return profile.currency


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=6)
    full_name = serializers.CharField(write_only=True, required=False, default='')

    class Meta:
        model  = User
        fields = ['id', 'username', 'email', 'password', 'full_name']
        extra_kwargs = {
            'username': {'required': False},
            'email':    {'required': True},
        }

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value.lower()

    def create(self, validated_data):
        full_name = validated_data.pop('full_name', '')
        password  = validated_data.pop('password')

        if not validated_data.get('username'):
            base = validated_data['email'].split('@')[0]
            username, counter = base, 1
            while User.objects.filter(username=username).exists():
                username = f"{base}{counter}"
                counter += 1
            validated_data['username'] = username

        parts = full_name.strip().split(' ', 1)
        return User.objects.create_user(
            **validated_data,
            password=password,
            first_name=parts[0] if parts else '',
            last_name=parts[1] if len(parts) > 1 else '',
        )


class TransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Transaction
        fields = ['id', 'title', 'category', 'type', 'amount', 'description', 'date', 'created_at']
        read_only_fields = ['id', 'created_at']

    def create(self, validated_data):
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)


class DashboardSerializer(serializers.Serializer):
    total_income        = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_expenses      = serializers.DecimalField(max_digits=12, decimal_places=2)
    balance             = serializers.DecimalField(max_digits=12, decimal_places=2)
    transaction_count   = serializers.IntegerField()
    recent_transactions = TransactionSerializer(many=True)