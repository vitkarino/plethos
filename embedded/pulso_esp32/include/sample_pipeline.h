#pragma once

#include <stddef.h>
#include <stdint.h>

namespace plethos {

constexpr size_t kMaximumBatchSize = 64;

struct PpgSample {
  uint64_t index;
  uint32_t ir;
  uint32_t red;
};

struct SampleBatch {
  PpgSample samples[kMaximumBatchSize];
  size_t count;
  uint32_t dropped_samples;
  uint32_t sequence;
};

class SamplePipeline {
 public:
  explicit SamplePipeline(uint8_t software_average = 1);

  void start_measurement();
  void add_raw_sample(uint32_t ir, uint32_t red);
  bool batch_ready() const;
  bool has_samples() const;
  SampleBatch take_batch();
  void flush_average();
  uint64_t acquired_sample_count() const;
  uint32_t total_dropped_sample_count() const;

 private:
  void append_averaged(uint32_t ir, uint32_t red);

  uint8_t software_average_;
  uint8_t average_count_;
  uint64_t ir_sum_;
  uint64_t red_sum_;
  uint64_t next_index_;
  uint32_t dropped_samples_;
  uint32_t total_dropped_samples_;
  uint32_t batch_sequence_;
  PpgSample samples_[kMaximumBatchSize];
  size_t count_;
};

}  // namespace plethos
