from django.test import TestCase
from django.contrib.auth.models import User
from .models import Transaction
from datetime import date


class TransactionModelTest(TestCase):

    def setUp(self):
        # Create a test user
        self.user = User.objects.create_user(
            username='testuser',
            password='testpassword'
        )

        # Create a sample transaction
        self.transaction = Transaction.objects.create(
            user=self.user,
            type='expense',
            category='food',
            title='Lunch',
            description='Bought lunch',
            amount=500.00,
            date=date.today()
        )

    # ✅ Test 1: Transaction creation
    def test_transaction_creation(self):
        self.assertEqual(self.transaction.user.username, 'testuser')
        self.assertEqual(self.transaction.type, 'expense')
        self.assertEqual(self.transaction.category, 'food')
        self.assertEqual(self.transaction.amount, 500.00)

    # ✅ Test 2: String representation
    def test_string_representation(self):
        expected_string = f"{self.user.username} - food (expense) $500.0"
        self.assertEqual(str(self.transaction), expected_string)

    # ✅ Test 3: Default values
    def test_default_values(self):
        transaction = Transaction.objects.create(
            user=self.user,
            type='income',
            category='salary',
            amount=1000.00,
            date=date.today()
        )

        self.assertEqual(transaction.title, '')
        self.assertEqual(transaction.description, '')

    # ✅ Test 4: get_icon method (valid category)
    def test_get_icon_valid_category(self):
        icon = self.transaction.get_icon()
        self.assertEqual(icon, 'fa-utensils')

    # ✅ Test 5: get_icon method (invalid category)
    def test_get_icon_invalid_category(self):
        transaction = Transaction.objects.create(
            user=self.user,
            type='expense',
            category='unknown',
            amount=200.00,
            date=date.today()
        )

        icon = transaction.get_icon()
        self.assertEqual(icon, 'fa-circle-dot')

    # ✅ Test 6: Transaction type choices
    def test_transaction_type_choices(self):
        self.assertIn(self.transaction.type, ['income', 'expense'])

    # ✅ Test 7: User relationship
    def test_user_relationship(self):
        self.assertEqual(self.transaction.user, self.user)

    # ✅ Test 8: Created_at auto field
    def test_created_at_auto_set(self):
        self.assertIsNotNone(self.transaction.created_at)

    # ✅ Test 9: Amount precision
    def test_amount_precision(self):
        self.assertEqual(float(self.transaction.amount), 500.00)