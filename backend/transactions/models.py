from django.db import models
from django.contrib.auth.models import User

CURRENCY_CHOICES = [
    ('USD', 'US Dollar ($)'),
    ('EUR', 'Euro (€)'),
    ('GBP', 'British Pound (£)'),
    ('KES', 'Kenyan Shilling (KSh)'),
    ('NGN', 'Nigerian Naira (₦)'),
    ('GHS', 'Ghanaian Cedi (₵)'),
    ('ZAR', 'South African Rand (R)'),
    ('UGX', 'Ugandan Shilling (USh)'),
    ('TZS', 'Tanzanian Shilling (TSh)'),
    ('CAD', 'Canadian Dollar (C$)'),
    ('AUD', 'Australian Dollar (A$)'),
    ('JPY', 'Japanese Yen (¥)'),
    ('INR', 'Indian Rupee (₹)'),
]

class Transaction(models.Model):
    TYPE_CHOICES = [('income', 'Income'), ('expense', 'Expense')]
    CATEGORY_ICONS = {
        'healthcare':    'fa-house-medical',
        'shopping':      'fa-bag-shopping',
        'entertainment': 'fa-film',
        'food':          'fa-utensils',
        'transport':     'fa-car',
        'salary':        'fa-briefcase',
        'freelance':     'fa-laptop',
        'bills':         'fa-bolt',
        'other':         'fa-circle-dot',
    }

    user        = models.ForeignKey(User, on_delete=models.CASCADE)
    type        = models.CharField(max_length=10, choices=TYPE_CHOICES)
    category    = models.CharField(max_length=50)
    title       = models.CharField(max_length=200, blank=True, default='')
    description = models.CharField(max_length=200, blank=True, default='')
    amount      = models.DecimalField(max_digits=10, decimal_places=2)
    date        = models.DateField()
    created_at  = models.DateTimeField(auto_now_add=True)

    def get_icon(self):
        return self.CATEGORY_ICONS.get(self.category.lower(), 'fa-circle-dot')

    def __str__(self):
        return f"{self.user.username} - {self.category} ({self.type}) ${self.amount}"


class UserProfile(models.Model):
    user     = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    currency = models.CharField(max_length=3, choices=CURRENCY_CHOICES, default='USD')

    def __str__(self):
        return f"{self.user.username} - {self.currency}"