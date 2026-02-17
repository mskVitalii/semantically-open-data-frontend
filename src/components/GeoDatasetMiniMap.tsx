import { Box, Button, Loader, Stack, Text } from '@mantine/core'
import { IconAlertTriangle, IconMap } from '@tabler/icons-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useEffect, useRef, useState } from 'react'
import type { WebService } from '../types'

interface GeoDatasetMiniMapProps {
  title: string
  web_services?: WebService[] | null
  height?: number
}

export function GeoDatasetMiniMap({
  title,
  web_services,
  height = 250,
}: GeoDatasetMiniMapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showMap, setShowMap] = useState(false)

  useEffect(() => {
    if (!showMap || !containerRef.current || !web_services?.length) {
      return
    }

    const webService = web_services[0]
    if (webService.format !== 'WFS') {
      return
    }

    const loadLayer = async () => {
      setLoading(true)
      try {
        if (!containerRef.current) return

        if (!mapRef.current) {
          mapRef.current = L.map(containerRef.current, {
            preferCanvas: true,
            zoomControl: true,
            scrollWheelZoom: false,
            doubleClickZoom: true,
          }).setView([52.52, 13.405], 10)

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

        setError(null)

        const baseUrl = webService.url.split('?')[0]
        const capUrl = `${baseUrl}?service=WFS&version=2.0.0&request=GetCapabilities`
        const capResponse = await fetch(capUrl)

        if (!capResponse.ok) {
          throw new Error('Failed to fetch capabilities')
        }

        const capText = await capResponse.text()
        console.log(
          `${title} - WFS Capabilities response (first 500 chars):`,
          capText.substring(0, 500),
        )

        // Try multiple patterns to extract feature type name
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
          console.warn(
            `${title} - Could not parse feature type name. Full response:`,
            capText,
          )
          throw new Error(
            'Could not extract feature type from capabilities. Check WFS service.',
          )
        }

        const featureType = featureNameMatch[1]
        console.log(`${title} - Extracted feature type:`, featureType)

        const getFeatureUrl = `${baseUrl}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${encodeURIComponent(featureType)}&outputFormat=application/json&maxfeatures=50`

        const featureResponse = await fetch(getFeatureUrl)

        if (!featureResponse.ok) {
          throw new Error('Failed to fetch features')
        }

        const geojsonData = await featureResponse.json()

        if (!mapRef.current) return

        const featureCount = geojsonData.features?.length || 0
        console.log(`${title} - Got ${featureCount} features`)

        if (featureCount === 0) {
          throw new Error('No features returned from WFS service')
        }

        if (featureCount > 200) {
          throw new Error(
            `Too many features (${featureCount}). Dataset too large to display.`,
          )
        }

        const geoJsonLayer = L.geoJSON(geojsonData, {
          style: {
            color: '#3b82f6',
            weight: 2,
            opacity: 0.7,
            fillOpacity: 0.2,
          },
          onEachFeature: (feature, layer) => {
            const props = feature.properties
            const propHtml = Object.entries(props)
              .slice(0, 3)
              .map(
                ([key, value]) =>
                  `<strong>${key}:</strong> ${String(value).substring(0, 50)}`,
              )
              .join('<br />')

            layer.bindPopup(
              `<div style="max-width: 200px;"><strong>${title}</strong><br />${propHtml}</div>`,
            )
          },
        })

        geoJsonLayer.addTo(mapRef.current)

        const bounds = geoJsonLayer.getBounds()
        if (bounds && bounds.isValid()) {
          // Small delay to ensure map is ready
          setTimeout(() => {
            if (mapRef.current) {
              mapRef.current.fitBounds(bounds, {
                padding: [30, 30],
                maxZoom: 15,
              })
            }
          }, 100)
        }

        setLoading(false)
      } catch (err) {
        console.error(`Error loading WFS for ${title}:`, err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    loadLayer()
  }, [title, web_services, showMap])

  if (!web_services?.length) {
    return null
  }

  if (!showMap) {
    return (
      <Box
        className="w-full rounded-md border border-gray-200 bg-gray-50 flex items-center justify-center"
        style={{ height }}
      >
        <Button
          leftSection={<IconMap size={16} />}
          variant="light"
          onClick={() => setShowMap(true)}
        >
          Show Map
        </Button>
      </Box>
    )
  }

  return (
    <Box
      ref={containerRef}
      className="w-full rounded-md overflow-hidden border border-gray-200 relative"
      style={{ height }}
    >
      {loading && (
        <Box className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
          <Loader size="sm" />
        </Box>
      )}
      {error && (
        <Box className="absolute inset-0 bg-red-50 flex items-center justify-center z-10 p-2">
          <Stack gap="xs" align="center">
            <IconAlertTriangle size={20} className="text-red-500" />
            <Text size="xs" c="red" className="text-center">
              {error}
            </Text>
          </Stack>
        </Box>
      )}
    </Box>
  )
}
