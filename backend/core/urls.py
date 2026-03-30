from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),

      # ── REST API (all prefixed with /api/) ────────────────────
    path('api/', include('transactions.urls')),
] 