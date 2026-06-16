<script setup lang="ts">
const route = useRoute();
const studyName = Array.isArray(route.params.name) ? route.params.name[0] : route.params.name;
const recordingIdParam = Array.isArray(route.params.recordingId) ? route.params.recordingId[0] : route.params.recordingId;
const recordingId = typeof recordingIdParam === 'string' ? recordingIdParam : '';

await navigateTo({
	path: `/study/${encodeURIComponent(studyName ?? '')}/dashboard`,
	query: recordingId ? { recording: recordingId } : undefined,
}, { replace: true });
</script>
