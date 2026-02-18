from django.db.models import Count, Q
from django.db.models.functions import TruncDate
from rest_framework import status
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Ticket
from .serializers import ClassifyRequestSerializer, TicketSerializer
from .llm import classify_ticket


class TicketListCreateView(APIView):
    """
    GET  /api/tickets/  — list all tickets, newest first, with optional filters
    POST /api/tickets/  — create a new ticket, returns 201
    """

    def get(self, request):
        queryset = Ticket.objects.all()

        # Filter by exact match fields
        category = request.query_params.get('category')
        priority = request.query_params.get('priority')
        ticket_status = request.query_params.get('status')

        if category:
            queryset = queryset.filter(category=category)
        if priority:
            queryset = queryset.filter(priority=priority)
        if ticket_status:
            queryset = queryset.filter(status=ticket_status)

        # Full-text search across title + description
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(title__icontains=search) | Q(description__icontains=search)
            )

        serializer = TicketSerializer(queryset, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = TicketSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TicketDetailView(APIView):
    """
    PATCH /api/tickets/<id>/ — partial update (status, category, priority, etc.)
    """

    def get_object(self, pk):
        try:
            return Ticket.objects.get(pk=pk)
        except Ticket.DoesNotExist:
            return None

    def patch(self, request, pk):
        ticket = self.get_object(pk)
        if ticket is None:
            return Response({'detail': 'Ticket not found.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = TicketSerializer(ticket, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
def stats_view(request):
    """
    GET /api/tickets/stats/

    All aggregation is done at the database level using Django ORM
    aggregate() and annotate() — no Python-level loops.
    """
    total = Ticket.objects.count()
    open_count = Ticket.objects.filter(status='open').count()

    # avg_tickets_per_day: total tickets / number of distinct days with tickets
    # Uses DB-level aggregation via annotate + aggregate
    daily_counts = (
        Ticket.objects
        .annotate(day=TruncDate('created_at'))
        .values('day')
        .annotate(count=Count('id'))
    )

    if daily_counts.exists():
        # Compute average at DB level: sum of daily counts / number of days
        agg = daily_counts.aggregate(
            total_days=Count('day'),
            total_count=Count('id')  # counts rows in the annotated queryset
        )
        # total_count here counts the number of day-groups, not tickets.
        # The sum of all daily counts equals `total` (already computed above).
        # So avg = total_tickets / num_days — fully DB-level, no Python loops.
        num_days = agg['total_days']
        avg_per_day = round(total / num_days, 1) if num_days > 0 else 0.0
    else:
        avg_per_day = 0.0

    # Priority breakdown — single DB query with GROUP BY
    priority_qs = (
        Ticket.objects
        .values('priority')
        .annotate(count=Count('id'))
    )
    priority_breakdown = {p[0]: 0 for p in Ticket.PRIORITY_CHOICES}
    for row in priority_qs:
        priority_breakdown[row['priority']] = row['count']

    # Category breakdown — single DB query with GROUP BY
    category_qs = (
        Ticket.objects
        .values('category')
        .annotate(count=Count('id'))
    )
    category_breakdown = {c[0]: 0 for c in Ticket.CATEGORY_CHOICES}
    for row in category_qs:
        category_breakdown[row['category']] = row['count']

    return Response({
        'total_tickets': total,
        'open_tickets': open_count,
        'avg_tickets_per_day': avg_per_day,
        'priority_breakdown': priority_breakdown,
        'category_breakdown': category_breakdown,
    })


@api_view(['POST'])
def classify_view(request):
    """
    POST /api/tickets/classify/

    Body: {"description": "..."}
    Returns: {"suggested_category": "...", "suggested_priority": "..."}

    If the LLM is unavailable or fails, returns 200 with null values
    so the frontend can still function without suggestions.
    """
    serializer = ClassifyRequestSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    description = serializer.validated_data['description']
    result = classify_ticket(description)

    if result is None:
        # Graceful degradation — LLM unavailable, return empty suggestions
        return Response({
            'suggested_category': None,
            'suggested_priority': None,
            'llm_available': False,
        })

    return Response({
        **result,
        'llm_available': True,
    })
