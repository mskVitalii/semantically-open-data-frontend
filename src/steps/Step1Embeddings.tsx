import {
  Badge,
  Button,
  Card,
  Group,
  Paper,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
} from '@mantine/core'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import type { Step1EmbeddingsType } from '../types'

type Step1EmbeddingsProps = {
  embeddings: Step1EmbeddingsType
  questionText: string
  embedderModel?: string
}

function Step1Embeddings({
  embeddings,
  questionText,
  embedderModel = 'jinaai-jina-embeddings-v3',
}: Step1EmbeddingsProps) {
  console.log('embeddings', embeddings)
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const pointsRef = useRef<THREE.Points | null>(null)
  const labelGroupRef = useRef<THREE.Group | null>(null)
  const frameRef = useRef<number | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)

  const [colorScheme, setColorScheme] = useState('rainbow')
  const [pointSize, setPointSize] = useState(0.1)
  const [rotationSpeed, setRotationSpeed] = useState(0.5)
  const [showLabels, setShowLabels] = useState(true)
  const [autoRotate, setAutoRotate] = useState(true)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const [remoteEmbeddings, setRemoteEmbeddings] = useState<{
    tokens: string[]
    points_3d: number[][]
    dimension: number
    embedder?: string
  } | null>(null)
  const [isEmbeddingLoading, setIsEmbeddingLoading] = useState<boolean>(false)
  const [embeddingError, setEmbeddingError] = useState<string>('')

  useEffect(() => {
    const text = questionText || embeddings.question
    if (!text) return

    const controller = new AbortController()
    setIsEmbeddingLoading(true)
    setEmbeddingError('')

    fetch(`${import.meta.env.VITE_API_URL}/v1/embeddings/embed_tokens`, {
      method: 'POST',
      headers: {
        accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        embedder_model: embedderModel,
      }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || 'Failed to fetch embeddings')
        }
        return response.json()
      })
      .then((data) => {
        setRemoteEmbeddings({
          tokens: data.tokens ?? [],
          points_3d: data.points_3d ?? [],
          dimension: data.dimension ?? 0,
          embedder: data.embedder,
        })
      })
      .catch((error: Error) => {
        if (error.name === 'AbortError') return
        setEmbeddingError(error.message)
      })
      .finally(() => {
        setIsEmbeddingLoading(false)
      })

    return () => controller.abort()
  }, [questionText, embeddings.question, embedderModel])

  const embeddingSource = useMemo(() => {
    if (remoteEmbeddings && remoteEmbeddings.points_3d.length > 0) {
      return {
        ...embeddings,
        tokens: remoteEmbeddings.tokens,
        points_3d: remoteEmbeddings.points_3d,
        dimension: remoteEmbeddings.dimension || embeddings.dimension,
        embedder_model: remoteEmbeddings.embedder,
      }
    }
    return embeddings
  }, [embeddings, remoteEmbeddings])

  const processedData = useMemo(() => {
    if (!embeddingSource?.points_3d || embeddingSource.points_3d.length === 0)
      return null

    const points3d = embeddingSource.points_3d
    const tokens = embeddingSource.tokens ?? []
    const magnitudes = points3d.map((pos) =>
      Math.sqrt(pos[0] ** 2 + pos[1] ** 2 + pos[2] ** 2),
    )
    const maxMagnitude = Math.max(...magnitudes, 1)

    const points = points3d.map((pos, i) => {
      const label = tokens[i] ?? `Token ${i + 1}`

      return {
        position: [pos[0] * 5, pos[1] * 5, pos[2] * 5],
        text: label,
        fullText: label,
        importance: magnitudes[i] / maxMagnitude,
        originalIndex: i,
      }
    })

    return {
      points,
      question: questionText || embeddingSource.question,
      reason: embeddingSource.reason,
      hash: embeddingSource.question_hash,
    }
  }, [embeddingSource, questionText])

  const modelLabel =
    embedderModel ||
    embeddings.embedding_model ||
    embeddings.embedder_model ||
    'Embedding model'
  const tokenCount = embeddingSource.tokens?.length ?? 0
  const embeddingDimension = embeddingSource.dimension ?? 0

  useEffect(() => {
    if (!mountRef.current || !processedData) return
    const mount = mountRef.current
    let renderer: THREE.WebGLRenderer,
      handleResize,
      handleMouseMove,
      handleClick

    const timeout = setTimeout(() => {
      if (
        !mountRef.current ||
        !processedData ||
        !mount.clientWidth ||
        !mount.clientHeight
      )
        return

      // #region SCENE SETUP
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0xf8f9fa)
      scene.fog = new THREE.Fog(0xf8f9fa, 10, 50)
      sceneRef.current = scene

      const camera = new THREE.PerspectiveCamera(
        75,
        mountRef.current.clientWidth / mountRef.current.clientHeight,
        0.1,
        1000,
      )
      camera.position.z = 15
      camera.position.y = 5
      cameraRef.current = camera

      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(
        mountRef.current.clientWidth,
        mountRef.current.clientHeight,
      )
      renderer.setPixelRatio(window.devicePixelRatio)
      mountRef.current.appendChild(renderer.domElement)
      rendererRef.current = renderer

      const ambientLight = new THREE.AmbientLight(0xffffff, 0.6)
      scene.add(ambientLight)
      const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4)
      directionalLight.position.set(10, 10, 10)
      scene.add(directionalLight)

      const axesHelper = new THREE.AxesHelper(5)
      scene.add(axesHelper)

      const gridHelper = new THREE.GridHelper(20, 20, 0xcccccc, 0xeeeeee)
      scene.add(gridHelper)

      // #endregion
      // #region POINTS
      const geometry = new THREE.BufferGeometry()
      const positions = new Float32Array(processedData.points.length * 3)
      const colors = new Float32Array(processedData.points.length * 3)
      const sizes = new Float32Array(processedData.points.length)

      processedData.points.forEach((point, i) => {
        positions[i * 3] = point.position[0]
        positions[i * 3 + 1] = point.position[1]
        positions[i * 3 + 2] = point.position[2]

        const color = new THREE.Color()
        if (colorScheme === 'rainbow') {
          color.setHSL(point.importance, 0.7, 0.5)
        } else if (colorScheme === 'blue') {
          color.setHSL(
            0.6,
            0.7 * point.importance,
            0.3 + 0.4 * point.importance,
          )
        } else if (colorScheme === 'green') {
          color.setHSL(
            0.3,
            0.7 * point.importance,
            0.3 + 0.4 * point.importance,
          )
        }

        colors[i * 3] = color.r
        colors[i * 3 + 1] = color.g
        colors[i * 3 + 2] = color.b

        sizes[i] = pointSize * (0.5 + point.importance)
      })

      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
      geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

      if (!showLabels) {
        const material = new THREE.PointsMaterial({
          size: pointSize,
          vertexColors: true,
          sizeAttenuation: true,
          transparent: true,
          opacity: 0.8,
          blending: THREE.AdditiveBlending,
        })

        const points = new THREE.Points(geometry, material)
        scene.add(points)
        pointsRef.current = points
      } else {
        pointsRef.current = null
      }
      // #endregion
      // #region LABELS
      if (showLabels) {
        const labelGroup = new THREE.Group()

        const createTextSprite = (text: string, importance: number) => {
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          if (!context) return null

          const fontSize = 36
          const padding = 12
          const font = `400 ${fontSize}px sans-serif`
          context.font = font
          const textWidth = Math.ceil(context.measureText(text).width)

          canvas.width = textWidth + padding * 2
          canvas.height = fontSize + padding * 2

          context.font = font
          const normalized = Math.min(1, Math.max(0, (importance - 0.1) / 0.5))
          const colorFactor = 0.5 + normalized * 0.5
          const alpha = 0.35 + colorFactor * 0.55
          context.clearRect(0, 0, canvas.width, canvas.height)
          context.fillStyle = `rgba(15, 23, 42, ${alpha})`
          context.fillText(text, padding, fontSize + padding / 2)

          const texture = new THREE.CanvasTexture(canvas)
          texture.minFilter = THREE.LinearFilter
          const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            opacity: alpha,
          })
          const sprite = new THREE.Sprite(spriteMaterial)
          const scale = 0.006 + colorFactor * 0.006
          sprite.scale.set(canvas.width * scale, canvas.height * scale, 1)
          return sprite
        }

        processedData.points.forEach((point) => {
          const importance = point.importance
          const percent = (importance * 100).toFixed(1)
          const sprite = createTextSprite(
            `${point.text} (${percent}%)`,
            importance,
          )
          if (!sprite) return
          sprite.position.set(
            point.position[0],
            point.position[1],
            point.position[2],
          )
          sprite.userData.pointIndex = point.originalIndex
          labelGroup.add(sprite)
        })

        scene.add(labelGroup)
        labelGroupRef.current = labelGroup
      }
      // #endregion
      // #region LINES
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x0066cc,
        opacity: 0.2,
        transparent: true,
      })

      for (let i = 0; i < processedData.points.length - 1; i++) {
        const lineGeometry = new THREE.BufferGeometry()
        const linePositions = new Float32Array(6)

        linePositions[0] = processedData.points[i].position[0]
        linePositions[1] = processedData.points[i].position[1]
        linePositions[2] = processedData.points[i].position[2]
        linePositions[3] = processedData.points[i + 1].position[0]
        linePositions[4] = processedData.points[i + 1].position[1]
        linePositions[5] = processedData.points[i + 1].position[2]

        lineGeometry.setAttribute(
          'position',
          new THREE.BufferAttribute(linePositions, 3),
        )
        const line = new THREE.Line(lineGeometry, lineMaterial)
        scene.add(line)
      }
      // #endregion
      // #region INTERACTIONS
      const raycaster = new THREE.Raycaster()
      raycaster.params.Points!.threshold = 0.5
      const mouse = new THREE.Vector2()

      const handleMouseMove = (event: MouseEvent) => {
        const rect = mountRef.current?.getBoundingClientRect()
        if (!rect) return

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

        raycaster.setFromCamera(mouse, camera)
        let hoveredIndex: number | null = null

        if (showLabels && labelGroupRef.current) {
          const labelIntersects = raycaster.intersectObjects(
            labelGroupRef.current.children,
            true,
          )
          if (labelIntersects.length > 0) {
            const labelIndex = labelIntersects[0].object.userData.pointIndex
            if (typeof labelIndex === 'number') hoveredIndex = labelIndex
          }
        }

        if (hoveredIndex === null && pointsRef.current) {
          const intersects = raycaster.intersectObject(pointsRef.current)
          if (intersects.length > 0) {
            const index = intersects[0].index
            if (index !== undefined) hoveredIndex = index
          }
        }

        setHoveredPoint(hoveredIndex)
      }

      const handleClick = (event: MouseEvent) => {
        const rect = mountRef.current?.getBoundingClientRect()
        if (!rect) return

        mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
        mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

        raycaster.setFromCamera(mouse, camera)
        let selectedIndex: number | null = null

        if (showLabels && labelGroupRef.current) {
          const labelIntersects = raycaster.intersectObjects(
            labelGroupRef.current.children,
            true,
          )
          if (labelIntersects.length > 0) {
            const labelIndex = labelIntersects[0].object.userData.pointIndex
            if (typeof labelIndex === 'number') selectedIndex = labelIndex
          }
        }

        if (selectedIndex === null && pointsRef.current) {
          const intersects = raycaster.intersectObject(pointsRef.current)
          if (intersects.length > 0) {
            const index = intersects[0].index
            if (index !== undefined) selectedIndex = index
          }
        }

        if (selectedIndex !== null) setSelectedPoint(selectedIndex)
      }

      renderer.domElement.addEventListener('mousemove', handleMouseMove)
      renderer.domElement.addEventListener('click', handleClick)
      // #endregion
      // #region CENTER
      const bbox = new THREE.Box3()
      processedData.points.forEach((p) => {
        const [x, y, z] = p.position
        bbox.expandByPoint(new THREE.Vector3(x, y, z))
      })
      const center = bbox.getCenter(new THREE.Vector3())
      const size = bbox.getSize(new THREE.Vector3())
      camera.position.set(center.x, center.y, center.z + size.length() * 0.9)
      camera.lookAt(center)
      // #endregion
      // #region RESIZE
      const handleResize = () => {
        if (!mountRef.current) return
        camera.aspect =
          mountRef.current.clientWidth / mountRef.current.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(
          mountRef.current.clientWidth,
          mountRef.current.clientHeight,
        )
      }
      window.addEventListener('resize', handleResize)
      // #endregion
      // #region ORBIT CONTROLS
      if (cameraRef.current && rendererRef.current) {
        controlsRef.current = new OrbitControls(
          cameraRef.current,
          rendererRef.current.domElement,
        )
        controlsRef.current.addEventListener('change', () => {
          renderer.render(scene, camera)
        })
      }
      // #endregion
    }, 0)

    const timeoutWaitUntilOpen = setTimeout(() => {
      console.log('Re-render', controlsRef.current)
      rendererRef.current!.render(sceneRef.current!, cameraRef.current!)
    }, 1)

    return () => {
      if (mount && renderer?.domElement) {
        mount.removeChild(renderer.domElement)
      }
      clearTimeout(timeout)
      clearTimeout(timeoutWaitUntilOpen)
      console.log('useEffect cleanup - unmounting')

      if (controlsRef.current) {
        controlsRef.current.dispose()
        controlsRef.current = null
      }

      if (labelGroupRef.current) {
        labelGroupRef.current.traverse((child) => {
          if (child instanceof THREE.Sprite) {
            const spriteMaterial = child.material as THREE.SpriteMaterial
            spriteMaterial.map?.dispose()
            spriteMaterial.dispose()
          }
        })
        labelGroupRef.current = null
      }

      if (renderer) {
        renderer.dispose()
      }

      if (handleResize) {
        window.removeEventListener('resize', handleResize)
      }

      if (renderer?.domElement && handleMouseMove) {
        renderer.domElement.removeEventListener('mousemove', handleMouseMove)
      }

      if (renderer?.domElement && handleClick) {
        renderer.domElement.removeEventListener('click', handleClick)
      }
    }
  }, [processedData, colorScheme, pointSize, showLabels])

  useEffect(() => {
    if (!sceneRef.current || !rendererRef.current || !cameraRef.current) return

    let mouseX = 0
    let mouseY = 0
    let targetRotationX = 0
    let targetRotationY = 0

    const handleMouseMove = (event: MouseEvent) => {
      if (!autoRotate) {
        mouseX = (event.clientX - window.innerWidth / 2) / window.innerWidth
        mouseY = (event.clientY - window.innerHeight / 2) / window.innerHeight
      }
    }

    window.addEventListener('mousemove', handleMouseMove)

    const animate = () => {
      frameRef.current = requestAnimationFrame(animate)

      if (pointsRef.current) {
        if (autoRotate) {
          pointsRef.current.rotation.y += 0.001 * rotationSpeed
          pointsRef.current.rotation.x = Math.sin(Date.now() * 0.0001) * 0.2
        } else {
          targetRotationY = mouseX * Math.PI
          targetRotationX = mouseY * Math.PI * 0.5

          pointsRef.current.rotation.x +=
            (targetRotationX - pointsRef.current.rotation.x) * 0.05
          pointsRef.current.rotation.y +=
            (targetRotationY - pointsRef.current.rotation.y) * 0.05
        }
      }

      rendererRef.current!.render(sceneRef.current!, cameraRef.current!)
    }

    animate()

    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current)
      }
      window.removeEventListener('mousemove', handleMouseMove)
    }
  }, [autoRotate, rotationSpeed])

  if (!processedData || !processedData.points) {
    console.log(embeddings, processedData)
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text>
          {isEmbeddingLoading
            ? 'Loading embeddings...'
            : embeddingError
              ? `Failed to load embeddings: ${embeddingError}`
              : 'No data to display'}
        </Text>
      </Card>
    )
  }

  return (
    <Stack gap="md" style={{ padding: '20px' }}>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="xl" fw={700}>
              3D Embeddings Visualization
            </Text>
            <Badge color="blue" variant="light">
              {modelLabel} | Tokens: {tokenCount} | Dimension:{' '}
              {embeddingDimension}
            </Badge>
          </Group>
          {embeddingError && (
            <Text size="xs" c="red">
              {embeddingError}
            </Text>
          )}
          {isEmbeddingLoading && !embeddingError && (
            <Text size="xs" c="dimmed">
              Fetching embeddings from local service...
            </Text>
          )}

          <Group gap="xl" grow>
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Point Size
              </Text>
              <Slider
                value={pointSize}
                onChange={setPointSize}
                min={0.05}
                max={0.5}
                step={0.05}
                label={(value) => value.toFixed(2)}
              />
            </Stack>

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Rotation Speed
              </Text>
              <Slider
                value={rotationSpeed}
                onChange={setRotationSpeed}
                min={0}
                max={2}
                step={0.1}
                label={(value) => value.toFixed(1)}
                disabled={!autoRotate}
              />
            </Stack>

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Color Scheme
              </Text>
              <Select
                value={colorScheme}
                onChange={(value: string | null) =>
                  value && setColorScheme(value)
                }
                data={[
                  { value: 'rainbow', label: 'Rainbow' },
                  { value: 'blue', label: 'Blue' },
                  { value: 'green', label: 'Green' },
                ]}
              />
            </Stack>

            <Stack gap="xs">
              <Text size="sm" fw={500}>
                Settings
              </Text>
              <Group>
                <Switch
                  label="Auto-rotate"
                  checked={autoRotate}
                  onChange={(event) =>
                    setAutoRotate(event.currentTarget.checked)
                  }
                />
                <Switch
                  label="Show labels"
                  checked={showLabels}
                  onChange={(event) =>
                    setShowLabels(event.currentTarget.checked)
                  }
                />
              </Group>
            </Stack>
          </Group>
        </Stack>
      </Card>

      <Card
        shadow="sm"
        padding="lg"
        radius="md"
        withBorder
        style={{ position: 'relative' }}
      >
        <div
          ref={mountRef}
          style={{
            width: '100%',
            height: '600px',
            cursor: autoRotate ? 'grab' : 'move',
          }}
        />

        <Paper
          shadow="md"
          p="md"
          style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            maxWidth: '400px',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(10px)',
          }}
        >
          <Stack gap="xs">
            <div>
              <Text fw={600} size="sm" c="dimmed">
                Question:
              </Text>
              <Text fw={700} size="md" style={{ wordBreak: 'break-word' }}>
                {processedData.question}
              </Text>
            </div>

            <div>
              <Text fw={600} size="sm" c="dimmed">
                Reason:
              </Text>
              <Text size="sm" style={{ wordBreak: 'break-word' }}>
                {processedData.reason}
              </Text>
            </div>

            <div>
              <Text fw={600} size="sm" c="dimmed">
                Hash:
              </Text>
              <Text
                size="xs"
                style={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
              >
                {processedData?.hash}
              </Text>
            </div>
          </Stack>
        </Paper>

        {showLabels && selectedPoint !== null && processedData && (
          <Paper
            shadow="md"
            p="md"
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              width: '250px',
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
            }}
          >
            <Stack gap="xs">
              <Text fw={600} size="sm">
                Selected Point:
              </Text>
              <Badge color="blue">
                {processedData.points[selectedPoint]?.text}
              </Badge>
              <Text size="xs" c="dimmed">
                Importance:{' '}
                {(
                  processedData.points[selectedPoint]?.importance * 100
                ).toFixed(1)}
                %
              </Text>
              <Button
                size="xs"
                variant="light"
                onClick={() => setSelectedPoint(null)}
              >
                Clear selection
              </Button>
            </Stack>
          </Paper>
        )}

        {showLabels && hoveredPoint !== null && processedData && (
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              left: '20px',
              padding: '8px 12px',
              backgroundColor: 'rgba(0, 0, 0, 0.8)',
              color: 'white',
              borderRadius: '4px',
              fontSize: '12px',
              pointerEvents: 'none',
            }}
          >
            {processedData.points[hoveredPoint]?.text}
          </div>
        )}
      </Card>
    </Stack>
  )
}

export default React.memo(Step1Embeddings)
