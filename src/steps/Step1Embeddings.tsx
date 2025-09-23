import React, { useMemo, useState, useRef, useEffect } from 'react'
import {
  Card,
  Text,
  Select,
  Group,
  Stack,
  Paper,
  Badge,
  Slider,
  Switch,
  Button,
} from '@mantine/core'
import * as THREE from 'three'

export type LLMQuestionWithEmbeddings = {
  question: string
  reason: string
  question_hash: string
  embeddings: number[] | number[][]
}

export type Step1EmbeddingsType = LLMQuestionWithEmbeddings

interface Step1EmbeddingsProps {
  embeddings: Step1EmbeddingsType
}

function simplePCA(vectors: number[][], targetDim: number = 3): number[][] {
  if (vectors.length === 0) return []

  const n = vectors.length
  const d = vectors[0].length

  const mean = new Array(d).fill(0)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < d; j++) {
      mean[j] += vectors[i][j] / n
    }
  }

  const centered = vectors.map((v) => v.map((val, j) => val - mean[j]))

  const projectionMatrix: number[][] = []
  for (let i = 0; i < targetDim; i++) {
    const row: number[] = []
    for (let j = 0; j < d; j++) {
      row.push((Math.random() - 0.5) * 2)
    }
    const norm = Math.sqrt(row.reduce((sum, val) => sum + val * val, 0))
    projectionMatrix.push(row.map((val) => val / norm))
  }

  return centered.map((vector) => {
    return projectionMatrix.map((projRow) =>
      vector.reduce((sum, val, i) => sum + val * projRow[i], 0),
    )
  })
}

function Step1Embeddings({ embeddings }: Step1EmbeddingsProps) {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const pointsRef = useRef<THREE.Points | null>(null)
  const frameRef = useRef<number | null>(null)

  const [colorScheme, setColorScheme] = useState('rainbow')
  const [pointSize, setPointSize] = useState(0.1)
  const [rotationSpeed, setRotationSpeed] = useState(0.5)
  const [showLabels, setShowLabels] = useState(true)
  const [autoRotate, setAutoRotate] = useState(true)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)

  const processedData = useMemo(() => {
    if (!embeddings) return null
    if (!embeddings.embeddings || embeddings.embeddings.length === 0)
      return null

    const vector = Array.isArray(embeddings.embeddings[0])
      ? (embeddings.embeddings[0] as number[])
      : (embeddings.embeddings as number[])

    const segmentSize = Math.floor(vector.length / 20)
    const points: Array<{
      position: number[]
      text: string
      fullText: string
      importance: number
      originalIndex: number
    }> = []

    for (let i = 0; i < 20 && i * segmentSize < vector.length; i++) {
      const segmentStart = i * segmentSize
      const segmentEnd = Math.min((i + 1) * segmentSize, vector.length)
      const segment = vector.slice(segmentStart, segmentEnd)

      const x = segment[0] || 0
      const y = segment[1] || 0
      const z = segment[2] || 0

      const norm = Math.sqrt(segment.reduce((sum, val) => sum + val * val, 0))

      points.push({
        position: [x * 5, y * 5, z * 5],
        text: `Segment ${i + 1}`,
        fullText: `${embeddings.question} (segment ${i + 1})`,
        importance: norm / Math.sqrt(segment.length),
        originalIndex: i,
      })
    }

    if (vector.length > 3) {
      const chunks: number[][] = []
      const chunkSize = 3
      for (let i = 0; i < vector.length - chunkSize; i += chunkSize) {
        chunks.push(vector.slice(i, i + chunkSize))
      }

      if (chunks.length > 3) {
        const reduced = simplePCA(chunks, 3)
        reduced.forEach((pos, i) => {
          points.push({
            position: [pos[0] * 5, pos[1] * 5, pos[2] * 5],
            text: `Point ${i + 1}`,
            fullText: embeddings.question,
            importance: 0.5 + Math.random() * 0.5,
            originalIndex: points.length + i,
          })
        })
      }
    }

    return {
      points,
      question: embeddings.question,
      reason: embeddings.reason,
      hash: embeddings.question_hash,
    }
  }, [embeddings])

  useEffect(() => {
    if (!mountRef.current || !processedData) return

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

    const renderer = new THREE.WebGLRenderer({ antialias: true })
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
        color.setHSL(0.6, 0.7 * point.importance, 0.3 + 0.4 * point.importance)
      } else if (colorScheme === 'green') {
        color.setHSL(0.3, 0.7 * point.importance, 0.3 + 0.4 * point.importance)
      }

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b

      sizes[i] = pointSize * (0.5 + point.importance)
    })

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))

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

    const raycaster = new THREE.Raycaster()
    raycaster.params.Points!.threshold = 0.5
    const mouse = new THREE.Vector2()

    const handleMouseMove = (event: MouseEvent) => {
      const rect = mountRef.current?.getBoundingClientRect()
      if (!rect) return

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObject(points)

      if (intersects.length > 0) {
        const index = intersects[0].index
        if (index !== undefined) {
          setHoveredPoint(index)
        }
      } else {
        setHoveredPoint(null)
      }
    }

    const handleClick = (event: MouseEvent) => {
      const rect = mountRef.current?.getBoundingClientRect()
      if (!rect) return

      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1

      raycaster.setFromCamera(mouse, camera)
      const intersects = raycaster.intersectObject(points)

      if (intersects.length > 0) {
        const index = intersects[0].index
        if (index !== undefined) {
          setSelectedPoint(index)
        }
      }
    }

    renderer.domElement.addEventListener('mousemove', handleMouseMove)
    renderer.domElement.addEventListener('click', handleClick)

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

    return () => {
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement)
      }
      renderer.dispose()
      window.removeEventListener('resize', handleResize)
      renderer.domElement.removeEventListener('mousemove', handleMouseMove)
      renderer.domElement.removeEventListener('click', handleClick)
    }
  }, [processedData, colorScheme, pointSize])

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
  if (
    !embeddings ||
    !processedData ||
    !processedData.points ||
    embeddings.embeddings.length === 0
  ) {
    console.log(embeddings, processedData)
    return (
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Text>No data to display</Text>
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
              BGE-M3 | Dimensions:{' '}
              {Array.isArray(embeddings.embeddings[0])
                ? (embeddings.embeddings[0] as number[]).length
                : (embeddings.embeddings as number[]).length}
            </Badge>
          </Group>

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
                {processedData?.question}
              </Text>
            </div>

            {processedData?.reason && (
              <div>
                <Text fw={600} size="sm" c="dimmed">
                  Reason:
                </Text>
                <Text size="sm" style={{ wordBreak: 'break-word' }}>
                  {processedData.reason}
                </Text>
              </div>
            )}

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

        {selectedPoint !== null && processedData && (
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

        {hoveredPoint !== null && processedData && (
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

      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="xs">
          <Text size="sm" c="dimmed">
            🎮 <strong>Controls:</strong>
          </Text>
          <Group gap="xl">
            <Text size="xs" c="dimmed">
              • {autoRotate ? 'Auto-rotating' : 'Move mouse to rotate'}
            </Text>
            <Text size="xs" c="dimmed">
              • Click point to select
            </Text>
            <Text size="xs" c="dimmed">
              • Hover for details
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            💡 Visualization shows different segments of your embedding vector
            in 3D space. Nearby points represent similar parts of the vector.
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}

export default React.memo(Step1Embeddings)
