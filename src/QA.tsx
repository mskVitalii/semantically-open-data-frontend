import React, { useState, useCallback, useRef } from 'react'
import {
  Card,
  Alert,
  Group,
  Stack,
  Title,
  Text,
  Badge,
  ActionIcon,
  Tooltip,
} from '@mantine/core'
import { IconAlertCircle, IconRefresh } from '@tabler/icons-react'
import type {
  Step0ResearchQuestionsType,
  Step1EmbeddingsType,
  Step2VectorSearchType,
  Step3InterpretationType,
} from './types'
import Step0ResearchQuestions from './steps/Step0ResearchQuestions'
import Step1Embeddings from './steps/Step1Embeddings'
import Step2VectorSearch from './steps/Step2VectorSearch'
import Step3Interpretation from './steps/Step3Interpretation'
import SearchForm from './SearchForm'

type StreamResponse =
  | {
      step: 0
      status: 'OK'
      data: Step0ResearchQuestionsType
    }
  | {
      step: 1
      status: 'OK'
      data: Step1EmbeddingsType
    }
  | {
      step: 2
      sub_step: number
      status: 'OK'
      data: Step2VectorSearchType
    }
  | {
      step: 3
      sub_step: number
      status: 'OK'
      data: Step3InterpretationType
    }
  | {
      step: number
      status: 'error'
      error: string
    }

const QA: React.FC = () => {
  const [response, setResponse] = useState<StreamResponse[]>([])
  const [step0, setStep0] = useState<Step0ResearchQuestionsType | null>(null)
  const [step1, setStep1] = useState<Step1EmbeddingsType[]>([])
  const [step2, setStep2] = useState<Step2VectorSearchType[]>([])
  const [step3, setStep3] = useState<Step3InterpretationType[]>([])
  // console.log(step0, step1, step2, step3)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const abortControllerRef = useRef<AbortController | null>(null)
  const responseEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new content arrives
  const scrollToBottom = useCallback(() => {
    responseEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  React.useEffect(() => {
    if (response) scrollToBottom()
  }, [response, scrollToBottom])

  const parseSSELine = (line: string): StreamResponse | null => {
    try {
      if (line === '[DONE]') return null

      return JSON.parse(line)
    } catch {
      // If not JSON, treat as plain text
      console.error('Failed to parse:', line)
      return null
    }
  }

  const handleStream = useCallback(async (question: string) => {
    handleClear()
    setIsLoading(true)

    let eventSource: EventSource | null = null
    let isManualClose = false

    try {
      const encodedQuestion = encodeURIComponent(question)
      const endpoint = `${import.meta.env.VITE_API_URL}/v1/datasets/qa`
      const url = `${endpoint}?question=${encodedQuestion}&use_grpc=true`

      eventSource = new EventSource(url)

      eventSource.onopen = () => {
        console.log('EventSource connection opened')
      }

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]' || event.data.includes('[DONE]')) {
          console.log('Stream completed successfully')
          eventSource?.close()
          setIsLoading(false)
          return
        }

        const parsed = parseSSELine(event.data)

        if (parsed) {
          setResponse((prev) => [...prev, parsed])

          if (parsed.status === 'error') return
          else if (parsed.step === 0) setStep0(parsed.data)
          else if (parsed.step === 1) setStep1(parsed.data)
          else if (parsed.step === 2) setStep2((prev) => [...prev, parsed.data])
          else if (parsed.step === 3) setStep3((prev) => [...prev, parsed.data])
        }
      }

      eventSource.onerror = (error) => {
        console.error('EventSource error:', error)
        if (isManualClose) eventSource?.close()

        if (eventSource?.readyState === EventSource.CLOSED) {
          console.log('Connection closed normally')
        } else if (eventSource?.readyState === EventSource.CONNECTING) {
          setError('Failed to establish connection')
        } else {
          setError('Connection error occurred')
        }

        setIsLoading(false)
        eventSource?.close()
      }

      abortControllerRef.current = {
        abort: () => {
          isManualClose = true
          eventSource?.close()
          setError('Request was cancelled')
          setIsLoading(false)
        },
      } as AbortController
    } catch (err) {
      if (err instanceof Error) {
        setError(`Error: ${err.message}`)
        console.error('Stream error:', err)
      } else {
        setError('An unknown error occurred')
      }
      setIsLoading(false)
    }

    return () => {
      isManualClose = true
      eventSource?.close()
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }, [])

  const handleCancel = useCallback((): void => {
    if (!abortControllerRef.current) return
    abortControllerRef.current.abort()
    abortControllerRef.current = null
  }, [])

  const handleSubmit = (question: string): void => {
    if (!isLoading && question.trim()) handleStream(question.trim())
  }

  const handleClear = (): void => {
    setResponse([])
    setStep0(null)
    setStep1(null)
    setStep2([])
    setStep3([])
    setError('')
  }

  return (
    <Card
      shadow="lg"
      padding="xl"
      radius="md"
      className="min-h-screen w-screen bg-gray-50 p-4"
    >
      <Stack>
        {/* Header */}
        <Group justify="space-between" align="center">
          <Title order={2} className="text-gray-800">
            Semantically Open Data QA
          </Title>
          <Badge color="blue" variant="light" size="lg">
            SSE Stream
          </Badge>
        </Group>

        {/* Input Section */}
        <SearchForm
          onSearch={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />

        {/* Error Display */}
        {error && (
          <Alert
            icon={<IconAlertCircle size={16} />}
            title="Error"
            color="red"
            variant="light"
            withCloseButton
            onClose={() => setError('')}
          >
            {error}
          </Alert>
        )}

        {/* Response Display */}
        {response.length > 0 && (
          <>
            <Group justify="space-between" mb="sm">
              <Group>
                <Text fw={600} size="lg" className="text-gray-700">
                  Response
                </Text>
                {isLoading && (
                  <Badge color="blue" variant="dot" size="sm">
                    Streaming...
                  </Badge>
                )}
              </Group>
              <Tooltip label="Clear response">
                <ActionIcon onClick={handleClear} variant="subtle" color="gray">
                  <IconRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            </Group>

            <div className="p-4">
              <>
                {step0 && <></>}
                {/* {step0 && <Step0ResearchQuestions {...step0} />} */}
                {step1 && (
                  <Step1Embeddings
                    embeddings={step1[0]}
                    // {...step1[0]}
                  />
                )}
                {step2.length > 0 && <Step2VectorSearch {...step2[0]} />}
                {step3.length > 0 && <Step3Interpretation {...step3[0]} />}
              </>
              <div ref={responseEndRef} />
            </div>
          </>
        )}
      </Stack>
    </Card>
  )
}

export default QA
