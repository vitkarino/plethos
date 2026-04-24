<script setup lang="ts">
import { IndexPageViewModel } from '~/controllers/pages/IndexPageViewModel';

const viewModel = new IndexPageViewModel();

viewModel.redirect();
</script>
