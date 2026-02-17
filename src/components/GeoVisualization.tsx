import {
  Badge,
  Box,
  Checkbox,
  Group,
  Loader,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core'
import { IconAlertTriangle, IconMap } from '@tabler/icons-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { WebService } from '../types'

interface GeoVisualizationProps {
  datasets: Array<{
    id: string
    title: string
    is_geo?: boolean
    web_services?: WebService[] | null
    city?: string | null
    state?: string | null
    country?: string | null
    score: number
  }>
}

const COLORS = [
  '#3b82f6',
  '#ef4444',
  '#10b981',
  '#f59e0b',
  '#8b5cf6',
  '#ec4899',
]

export function GeoVisualization({ datasets }: GeoVisualizationProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<Set<string>>(
    new Set(),
  )
  const layersRef = useRef<Record<string, L.GeoJSON>>({})
  const loadedIdsRef = useRef<Set<string>>(new Set())

  const geoDatasets = datasets.filter((d) => d.is_geo && d.web_services?.length)

  console.log('GeoVisualization - all datasets:', datasets)
  console.log('GeoVisualization - filtered geoDatasets:', geoDatasets)

  const toggleDataset = useCallback(
    async (datasetId: string) => {
      const dataset = geoDatasets.find((d) => d.id === datasetId)
      if (!dataset || !mapRef.current) return

      const isSelected = selectedDatasetIds.has(datasetId)

      if (isSelected) {
        // Remove layer from map
        const layer = layersRef.current[datasetId]
        if (layer) {
          mapRef.current.removeLayer(layer)
          delete layersRef.current[datasetId]
        }
        loadedIdsRef.current.delete(datasetId)

        setSelectedDatasetIds((prev) => {
          const next = new Set(prev)
          next.delete(datasetId)
          return next
        })
      } else {
        // Add layer to map
        setSelectedDatasetIds((prev) => new Set(prev).add(datasetId))

        const webService = dataset.web_services?.[0]
        if (!webService || webService.format !== 'WFS') {
          console.warn(`${dataset.title} - No valid WFS service`)
          return
        }

        setLoading(true)
        setError(null)

        try {
          const baseUrl = webService.url.split('?')[0]
          const capUrl = `${baseUrl}?service=WFS&version=2.0.0&request=GetCapabilities`

          const capResponse = await fetch(capUrl)
          if (!capResponse.ok) {
            throw new Error(`HTTP ${capResponse.status}`)
          }

          const capText = await capResponse.text()

          let featureNameMatch = capText.match(
            /<FeatureType>[^<]*<Name>([^<]+)<\/Name>/i,
          )
          if (!featureNameMatch) {
            featureNameMatch = capText.match(/<Name>([^<]+)<\/Name>/i)
          }
          if (!featureNameMatch) {
            featureNameMatch = capText.match(/<wfs:Name>([^<]+)<\/wfs:Name>/i)
          }

          if (!featureNameMatch) {
            throw new Error('Could not parse WFS feature type')
          }

          const featureType = featureNameMatch[1]
          const getFeatureUrl = `${baseUrl}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${encodeURIComponent(featureType)}&outputFormat=application/json&maxfeatures=100`

          const featureResponse = await fetch(getFeatureUrl)
          if (!featureResponse.ok) {
            throw new Error(
              `Failed to fetch features: HTTP ${featureResponse.status}`,
            )
          }

          const geojsonData = await featureResponse.json()

          if (!mapRef.current) return

          const featureCount = geojsonData.features?.length || 0
          console.log(`${dataset.title} - Got ${featureCount} features`)

          if (featureCount === 0) {
            throw new Error('No features returned from WFS service')
          }

          if (featureCount > 300) {
            throw new Error(
              `Too many features (${featureCount}). Dataset too large. Try a different dataset.`,
            )
          }

          const datasetIndex = geoDatasets.findIndex((d) => d.id === datasetId)
          const color = COLORS[datasetIndex % COLORS.length]
          const geoJsonLayer = L.geoJSON(geojsonData, {
            style: {
              color,
              weight: 2,
              opacity: 0.7,
              fillOpacity: 0.2,
            },
            onEachFeature: (feature, layer) => {
              const props = feature.properties
              const propHtml = Object.entries(props)
                .map(
                  ([key, value]) =>
                    `<strong>${key}:</strong> ${String(value).substring(0, 100)}`,
                )
                .join('<br />')

              layer.bindPopup(
                `<div><strong>${dataset.title}</strong><br />${propHtml}</div>`,
              )
            },
          })

          geoJsonLayer.addTo(mapRef.current)
          layersRef.current[datasetId] = geoJsonLayer
          loadedIdsRef.current.add(datasetId)

          const bounds = geoJsonLayer.getBounds()
          if (bounds && bounds.isValid()) {
            // Small delay to ensure map is rendered
            setTimeout(() => {
              if (mapRef.current) {
                mapRef.current.fitBounds(bounds, {
                  padding: [50, 50],
                  maxZoom: 14,
                })
              }
            }, 100)
          }

          console.log(`${dataset.title} - Successfully loaded on map`)
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : 'Unknown error'
          console.error(`${dataset.title} - Error:`, err)
          setError(`${dataset.title}: ${errMsg}`)

          // Remove from selection on error
          setSelectedDatasetIds((prev) => {
            const next = new Set(prev)
            next.delete(datasetId)
            return next
          })
        } finally {
          setLoading(false)
        }
      }
    },
    [geoDatasets, selectedDatasetIds],
  )

  useEffect(() => {
    if (!containerRef.current) return

    const initialLat = 52.52
    const initialLng = 13.405

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        preferCanvas: true,
        zoomControl: true,
        scrollWheelZoom: false,
        doubleClickZoom: true,
      }).setView([initialLat, initialLng], 10)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        minZoom: 2,
        subdomains: ['a', 'b', 'c'],
        keepBuffer: 4,
        updateWhenIdle: false,
        updateWhenZooming: false,
        crossOrigin: true,
      }).addTo(mapRef.current)
    }
  }, [])

  if (geoDatasets.length === 0) {
    return (
      <Stack
        gap="md"
        align="center"
        justify="center"
        className="h-96 bg-gray-50 rounded-md"
      >
        <IconMap size={32} className="text-gray-400" />
        <Text c="dimmed">No geographic datasets found in results</Text>
      </Stack>
    )
  }

  return (
    <Stack gap="md" className="w-full">
      <Group justify="space-between">
        <Group gap="xs">
          <Badge
            size="lg"
            variant="light"
            color="teal"
            leftSection={<IconMap size={14} />}
          >
            Geographic Datasets
          </Badge>
          <Badge size="lg" variant="filled" color="gray">
            {geoDatasets.length} available
          </Badge>
          {selectedDatasetIds.size > 0 && (
            <Badge size="lg" variant="filled" color="teal">
              {selectedDatasetIds.size} on map
            </Badge>
          )}
        </Group>
        {loading && <Loader size="sm" />}
      </Group>

      {error && (
        <Box className="bg-red-50 border border-red-200 rounded-md p-3">
          <Group gap="xs">
            <IconAlertTriangle size={16} className="text-red-500" />
            <Text size="sm" c="red">
              {error}
            </Text>
          </Group>
        </Box>
      )}

      <Box
        ref={containerRef}
        className="w-full rounded-md overflow-hidden border border-gray-200"
        style={{ height: '500px' }}
      />

      <Stack
        gap="xs"
        className="bg-gray-50 p-4 rounded-md border border-gray-200 mt-2"
      >
        <Text size="sm" fw={600} c="dark" className="mb-2">
          Select Datasets to Display ({selectedDatasetIds.size} selected)
        </Text>
        {geoDatasets.map((dataset, index) => (
          <Group key={dataset.id} gap="xs" wrap="nowrap">
            <Checkbox
              checked={selectedDatasetIds.has(dataset.id)}
              onChange={() => toggleDataset(dataset.id)}
              size="sm"
              styles={{
                input: {
                  cursor: 'pointer',
                },
              }}
            />
            <Box
              className="w-3 h-3 rounded shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <Tooltip label={dataset.title} multiline maw={300}>
              <Text
                size="sm"
                className="truncate flex-1"
                style={{ cursor: 'pointer' }}
                onClick={() => toggleDataset(dataset.id)}
              >
                {dataset.title}
              </Text>
            </Tooltip>
            <Badge size="xs" variant="light" color="cyan">
              {(dataset.score * 100).toFixed(1)}%
            </Badge>
          </Group>
        ))}
      </Stack>
    </Stack>
  )
}
