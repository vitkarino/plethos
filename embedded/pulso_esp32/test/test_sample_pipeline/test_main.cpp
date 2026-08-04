#include <unity.h>

#include "sample_pipeline.h"

using plethos::SamplePipeline;
using plethos::kMaximumBatchSize;

void setUp() {}
void tearDown() {}

void test_software_average_preserves_original_rounding() {
  SamplePipeline pipeline(2);
  pipeline.start_measurement();
  pipeline.add_raw_sample(10, 20);
  pipeline.add_raw_sample(13, 25);
  const auto batch = pipeline.take_batch();
  TEST_ASSERT_EQUAL_UINT32(12, batch.samples[0].ir);
  TEST_ASSERT_EQUAL_UINT32(23, batch.samples[0].red);
}

void test_indices_are_monotonic_when_full_buffer_drops_samples() {
  SamplePipeline pipeline;
  pipeline.start_measurement();
  for (size_t index = 0; index < kMaximumBatchSize + 3; ++index) {
    pipeline.add_raw_sample(index, index);
  }
  const auto first = pipeline.take_batch();
  TEST_ASSERT_EQUAL_UINT64(0, first.samples[0].index);
  TEST_ASSERT_EQUAL_UINT64(kMaximumBatchSize - 1, first.samples[first.count - 1].index);
  TEST_ASSERT_EQUAL_UINT32(3, first.dropped_samples);
  TEST_ASSERT_EQUAL_UINT32(3, pipeline.total_dropped_sample_count());

  pipeline.add_raw_sample(100, 100);
  const auto second = pipeline.take_batch();
  TEST_ASSERT_EQUAL_UINT64(kMaximumBatchSize + 3, second.samples[0].index);
  TEST_ASSERT_EQUAL_UINT32(1, second.sequence);
}

void test_new_measurement_resets_indices_and_batch_sequence() {
  SamplePipeline pipeline;
  pipeline.start_measurement();
  pipeline.add_raw_sample(1, 2);
  TEST_ASSERT_EQUAL_UINT32(0, pipeline.take_batch().sequence);
  pipeline.start_measurement();
  pipeline.add_raw_sample(3, 4);
  const auto batch = pipeline.take_batch();
  TEST_ASSERT_EQUAL_UINT64(0, batch.samples[0].index);
  TEST_ASSERT_EQUAL_UINT32(0, batch.sequence);
}

int main() {
  UNITY_BEGIN();
  RUN_TEST(test_software_average_preserves_original_rounding);
  RUN_TEST(test_indices_are_monotonic_when_full_buffer_drops_samples);
  RUN_TEST(test_new_measurement_resets_indices_and_batch_sequence);
  return UNITY_END();
}
