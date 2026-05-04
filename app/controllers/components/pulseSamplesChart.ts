import type { BPMChartData, PulseSample } from '~/types/components/bpm-block'
import type { EntityId, RecordingSample } from '~/types/shared/entities'

export function createChartDataFromPulseSamples(samples: PulseSample[]): BPMChartData {
	return {
		labels: samples.map((sample) => sample.sample_index),
		datasets: [
			{
				label: 'R',
				data: samples,
				sampleChannel: 'r',
				parsing: {
					xAxisKey: 'sample_index',
					yAxisKey: 'raw_data.r',
				},
				borderColor: '#e85d75',
				backgroundColor: '#e85d75',
				pointRadius: 0,
			},
			{
				label: 'IR',
				data: samples,
				sampleChannel: 'ir',
				parsing: {
					xAxisKey: 'sample_index',
					yAxisKey: 'raw_data.ir',
				},
				borderColor: '#4aa8ff',
				backgroundColor: '#4aa8ff',
				pointRadius: 0,
			},
		],
	}
}

export function createChartDataFromRecordingSamples(recordingId: EntityId, samples: RecordingSample[]): BPMChartData {
	return createChartDataFromPulseSamples(samples.map((sample) => {
		return {
			recording_id: recordingId,
			sample_index: sample.index,
			raw_data: {
				r: sample.red_filtered ?? sample.red,
				ir: sample.ir_filtered ?? sample.ir,
			},
			created_at: new Date(Date.now() + sample.index).toISOString(),
		}
	}))
}
