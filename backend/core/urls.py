from django.contrib import admin
from django.urls import path, include
from transactions import views as v

urlpatterns = [
    path('admin/', admin.site.urls),

      # ── REST API (all prefixed with /api/) ────────────────────
    path('api/', include('transactions.urls')),
] 