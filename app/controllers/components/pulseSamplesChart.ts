import type { BPMChartData, PulseSample } from '~/types/components/bpm-block'

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
