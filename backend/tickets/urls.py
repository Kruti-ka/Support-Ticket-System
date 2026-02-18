from django.urls import path
from .views import TicketListCreateView, TicketDetailView, stats_view, classify_view

urlpatterns = [
    path('tickets/', TicketListCreateView.as_view(), name='ticket-list-create'),
    path('tickets/stats/', stats_view, name='ticket-stats'),
    path('tickets/classify/', classify_view, name='ticket-classify'),
    path('tickets/<int:pk>/', TicketDetailView.as_view(), name='ticket-detail'),
]
