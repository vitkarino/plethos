#include "sample_pipeline.h"

#include <string.h>

namespace plethos {

SamplePipeline::SamplePipeline(uint8_t software_average)
    : software_average_(software_average == 0 ? 1 : software_average),
      average_count_(0),
      ir_sum_(0),
      red_sum_(0),
      next_index_(0),
      dropped_samples_(0),
      total_dropped_samples_(0),
      batch_sequence_(0),
      count_(0) {}

void SamplePipeline::start_measurement() {
  average_count_ = 0;
  ir_sum_ = 0;
  red_sum_ = 0;
  next_index_ = 0;
  dropped_samples_ = 0;
  total_dropped_samples_ = 0;
  batch_sequence_ = 0;
  count_ = 0;
}

void SamplePipeline::add_raw_sample(uint32_t ir, uint32_t red) {
  ir_sum_ += ir;
  red_sum_ += red;
  ++average_count_;
  if (average_count_ >= software_average_) {
    flush_average();
  }
}

void SamplePipeline::flush_average() {
  if (average_count_ == 0) {
    return;
  }
  const uint32_t ir = static_cast<uint32_t>((ir_sum_ + average_count_ / 2) / average_count_);
  const uint32_t red = static_cast<uint32_t>((red_sum_ + average_count_ / 2) / average_count_);
  average_count_ = 0;
  ir_sum_ = 0;
  red_sum_ = 0;
  append_averaged(ir, red);
}

void SamplePipeline::append_averaged(uint32_t ir, uint32_t red) {
  const uint64_t index = next_index_++;
  if (count_ >= kMaximumBatchSize) {
    ++dropped_samples_;
    ++total_dropped_samples_;
    return;
  }
  samples_[count_++] = {index, ir, red};
}

bool SamplePipeline::batch_ready() const { return count_ == kMaximumBatchSize; }

bool SamplePipeline::has_samples() const { return count_ > 0; }

SampleBatch SamplePipeline::take_batch() {
  SampleBatch batch{};
  memcpy(batch.samples, samples_, count_ * sizeof(PpgSample));
  batch.count = count_;
  batch.dropped_samples = dropped_samples_;
  batch.sequence = batch_sequence_++;
  count_ = 0;
  dropped_samples_ = 0;
  return batch;
}

uint64_t SamplePipeline::acquired_sample_count() const { return next_index_; }

uint32_t SamplePipeline::total_dropped_sample_count() const {
  return total_dropped_samples_;
}

}  // namespace plethos
