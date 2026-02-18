from rest_framework import serializers

from .models import Ticket


class TicketSerializer(serializers.ModelSerializer):
    """
    Serializer for the Ticket model.

    Field-level validation for category/priority/status is intentionally
    delegated to the model `choices` constraints and DRF's built-in
    validation to avoid duplicating the same rules in multiple places.
    """

    class Meta:
        model = Ticket
        fields = ['id', 'title', 'description', 'category', 'priority', 'status', 'created_at']
        read_only_fields = ['id', 'created_at']


class ClassifyRequestSerializer(serializers.Serializer):
    description = serializers.CharField(max_length=5000)
