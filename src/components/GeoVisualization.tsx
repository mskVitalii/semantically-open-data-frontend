import { Badge, Box, Group, Loader, Stack, Text, Tooltip } from '@mantine/core'
import { IconAlertTriangle, IconMap } from '@tabler/icons-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
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
  const layersRef = useRef<Record<string, L.GeoJSON>>({})

  const geoDatasets = datasets.filter((d) => d.is_geo && d.web_services?.length)

  console.log('GeoVisualization - all datasets:', datasets)
  console.log('GeoVisualization - filtered geoDatasets:', geoDatasets)
  // datasets.forEach((d, i) => {
  //   console.log(`Dataset ${i}:`, {
  //     title: d.title,
  //     is_geo: d.is_geo,
  //     web_services: d.web_services,
  //     hasWebServices: d.web_services?.length,
  //   })
  // })

  useEffect(() => {
    if (!containerRef.current || geoDatasets.length === 0) return

    const initialLat = 52.52
    const initialLng = 13.405

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView(
        [initialLat, initialLng],
        10,
      )

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        maxNativeZoom: 18,
      }).addTo(mapRef.current)
    }

    const loadLayers = async () => {
      if (!mapRef.current) return

      setLoading(true)
      setError(null)

      try {
        for (let i = 0; i < geoDatasets.length; i++) {
          const dataset = geoDatasets[i]
          const webService = dataset.web_services?.[0]

          if (!webService || webService.format !== 'WFS') continue

          try {
            const capUrl = `${webService.url}?service=WFS&version=2.0.0&request=GetCapabilities`
            const capResponse = await fetch(capUrl)

            if (!capResponse.ok) {
              console.warn(`Failed to fetch capabilities for ${dataset.title}`)
              continue
            }

            const capText = await capResponse.text()
            const featureNameMatch = capText.match(/<Name>([^<]+)<\/Name>/)

            if (!featureNameMatch) {
              console.warn(`No feature types found for ${dataset.title}`)
              continue
            }

            const featureType = featureNameMatch[1]
            const getFeatureUrl = `${webService.url}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${encodeURIComponent(featureType)}&outputFormat=application/json&maxfeatures=1000`

            const featureResponse = await fetch(getFeatureUrl)

            if (!featureResponse.ok) {
              console.warn(`Failed to fetch features for ${dataset.title}`)
              continue
            }

            const geojsonData = await featureResponse.json()

            const color = COLORS[i % COLORS.length]
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
            layersRef.current[dataset.id] = geoJsonLayer

            if (i === 0 && geoJsonLayer.getBounds().isValid()) {
              mapRef.current.fitBounds(geoJsonLayer.getBounds(), {
                padding: [50, 50],
              })
            }
          } catch (err) {
            console.error(`Error loading WFS for ${dataset.title}:`, err)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        setLoading(false)
      }
    }

    loadLayers()
  }, [geoDatasets])

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
            {geoDatasets.length} Datasets
          </Badge>
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
          Loaded Datasets
        </Text>
        {geoDatasets.map((dataset, index) => (
          <Group key={dataset.id} gap="xs">
            <Box
              className="w-3 h-3 rounded shrink-0"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <Tooltip label={dataset.title} multiline maw={300}>
              <Text size="sm" className="truncate flex-1">
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
