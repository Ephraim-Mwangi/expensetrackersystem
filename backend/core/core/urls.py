from django.contrib import admin
from django.urls import path, include
from transactions import views as v

urlpatterns = [
    path('admin/', admin.site.urls),

    # ── HTML Pages ────────────────────────────────────────────
    path('',              v.login_page,        name='login'),
    path('login/',        v.login_page,        name='login-page'),
    path('dashboard/',    v.dashboard_page,    name='dashboard'),
    path('transactions/', v.transactions_page, name='transactions'),
    path('analytics/',    v.analytics_page,    name='analytics'),

    # ── REST API (all prefixed with /api/) ────────────────────
    path('api/', include('transactions.urls')),
] 