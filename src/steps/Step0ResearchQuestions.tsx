import React from 'react'
import {
  Card,
  Title,
  Text,
  Badge,
  Group,
  Stack,
  Paper,
  Divider,
} from '@mantine/core'
import { IconQuestionMark, IconSparkles, IconHash } from '@tabler/icons-react'
import type { Step0ResearchQuestionsType } from '../types'

function Step0ResearchQuestions({
  question,
  research_questions,
}: Step0ResearchQuestionsType) {
  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Card
        shadow="md"
        radius="lg"
        className="bg-white dark:bg-slate-900"
        withBorder
      >
        {/* Header Section */}
        <div className="mb-6">
          <Group align="center" mb="md">
            <div className="p-2 rounded-lg bg-blue-500">
              <IconQuestionMark className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <Title order={2} className="text-slate-800 dark:text-slate-100">
                Research Question Analysis
              </Title>
              <Text size="sm" c="dimmed" className="mt-1">
                {research_questions.length} sub-questions generated
              </Text>
            </div>
            <Badge size="lg" variant="filled" color="blue">
              {research_questions.length} Questions
            </Badge>
          </Group>

          {/* Main Question Card */}
          <Paper p="lg" radius="md" className="bg-blue-600">
            <Group align="flex-start">
              <IconSparkles className="w-5 h-5" />
              <div className="flex-1">
                <Text
                  size="xs"
                  className="opacity-90 uppercase tracking-wider font-semibold mb-1"
                >
                  Primary Research Question
                </Text>
                <Text size="lg" fw={600} className="leading-relaxed">
                  {question}
                </Text>
              </div>
            </Group>
          </Paper>
        </div>

        <Divider my="xl" />

        {/* Questions List */}
        <div className="mb-4">
          <Text
            fw={500}
            size="lg"
            className="text-slate-700 dark:text-slate-200 mb-4"
          >
            Research Sub-Questions
          </Text>

          <Stack gap="md">
            {research_questions.map((rq, index) => (
              <Paper
                key={index}
                p="lg"
                radius="md"
                className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
                withBorder
              >
                <Stack gap="sm">
                  {/* Question Header */}
                  <Group justify="space-between" align="flex-start">
                    <Badge size="sm" variant="light" color="blue">
                      Question #{index + 1}
                    </Badge>
                    {rq.question_hash && (
                      <Group gap="xs">
                        <IconHash className="w-3 h-3 text-slate-400" />
                        <Text size="xs" c="dimmed" className="font-mono">
                          {rq.question_hash}
                        </Text>
                      </Group>
                    )}
                  </Group>

                  {/* Question Text */}
                  <Text
                    size="md"
                    fw={600}
                    className="text-slate-800 dark:text-slate-100 leading-relaxed"
                  >
                    {rq.question}
                  </Text>

                  {/* Reason */}
                  <div className="mt-2 pl-4 border-l-2 border-slate-300 dark:border-slate-600">
                    <Text
                      size="sm"
                      c="dimmed"
                      className="text-slate-500 dark:text-slate-400 leading-relaxed"
                    >
                      <span className="font-semibold">Reasoning:</span>{' '}
                      {rq.reason}
                    </Text>
                  </div>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </div>
      </Card>
    </div>
  )
}

export default React.memo(Step0ResearchQuestions)
