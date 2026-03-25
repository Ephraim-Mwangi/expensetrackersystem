from django.db import models
from django.contrib.auth.models import User

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

    user        = models.ForeignKey(User, on_delete=models.CASCADE)  # removed duplicate OneToOneField
    type        = models.CharField(max_length=10, choices=TYPE_CHOICES)
    category    = models.CharField(max_length=50)
    title       = models.CharField(max_length=200, blank=True, default='')  # added title
    description = models.CharField(max_length=200, blank=True, default='')
    amount      = models.DecimalField(max_digits=10, decimal_places=2)
    date        = models.DateField()
    created_at  = models.DateTimeField(auto_now_add=True)              # added created_at

    def get_icon(self):
        return self.CATEGORY_ICONS.get(self.category.lower(), 'fa-circle-dot')

    def __str__(self):
        return f"{self.user.username} - {self.category} ({self.type}) ${self.amount}"