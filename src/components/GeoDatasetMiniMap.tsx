import { Box, Loader, Stack, Text } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !web_services?.length) {
      setLoading(false)
      return
    }

    const webService = web_services[0]
    if (webService.format !== 'WFS') {
      setLoading(false)
      return
    }

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current).setView([52.52, 13.405], 10)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
        maxNativeZoom: 18,
      }).addTo(mapRef.current)
    }

    const loadLayer = async () => {
      try {
        setError(null)

        const capUrl = `${webService.url}?service=WFS&version=2.0.0&request=GetCapabilities`
        const capResponse = await fetch(capUrl)

        if (!capResponse.ok) {
          throw new Error('Failed to fetch capabilities')
        }

        const capText = await capResponse.text()
        const featureNameMatch = capText.match(/<Name>([^<]+)<\/Name>/)

        if (!featureNameMatch) {
          throw new Error('No feature types found')
        }

        const featureType = featureNameMatch[1]

        const getFeatureUrl = `${webService.url}?service=WFS&version=2.0.0&request=GetFeature&typeNames=${encodeURIComponent(featureType)}&outputFormat=application/json&maxfeatures=500`

        const featureResponse = await fetch(getFeatureUrl)

        if (!featureResponse.ok) {
          throw new Error('Failed to fetch features')
        }

        const geojsonData = await featureResponse.json()

        if (!mapRef.current) return

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

        if (geoJsonLayer.getBounds().isValid()) {
          mapRef.current.fitBounds(geoJsonLayer.getBounds(), {
            padding: [30, 30],
          })
        }

        setLoading(false)
      } catch (err) {
        console.error(`Error loading WFS for ${title}:`, err)
        setError(err instanceof Error ? err.message : 'Unknown error')
        setLoading(false)
      }
    }

    loadLayer()
  }, [title, web_services])

  if (!web_services?.length) {
    return null
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
