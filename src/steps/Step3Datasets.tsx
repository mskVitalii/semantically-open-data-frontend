import {
  Accordion,
  Badge,
  Card,
  Divider,
  Group,
  ScrollArea,
  Stack,
  Table,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core'
import { IconAlertCircle, IconTable } from '@tabler/icons-react'
import React, { useMemo } from 'react'
import type { DatasetSample, Step3DatasetsType } from '../types'

interface DatasetTableProps {
  sample: DatasetSample
}

function DatasetTable({ sample }: DatasetTableProps) {
  // Get all unique column names from all rows
  const columns = useMemo(() => {
    if (!sample.sample || sample.sample.length === 0) {
      return []
    }
    const columnSet = new Set<string>()
    sample.sample.forEach((row) => {
      Object.keys(row).forEach((key) => columnSet.add(key))
    })
    return Array.from(columnSet)
  }, [sample.sample])

  if (!sample.sample || sample.sample.length === 0) {
    return (
      <Group gap="xs" justify="center" className="py-4">
        <IconAlertCircle size={18} className="text-yellow-600" />
        <Text size="sm" c="dimmed">
          No sample data available
        </Text>
      </Group>
    )
  }

  return (
    <Stack gap="md">
      {/* Sample Info */}
      <Group justify="space-between">
        <Group gap="xs">
          <Badge variant="light" color="blue">
            Total Rows: {sample.row_count}
          </Badge>
          <Badge variant="light" color="cyan">
            Columns: {columns.length}
          </Badge>
          <Badge variant="light" color="teal">
            Sample Size: {sample.sample.length}
          </Badge>
        </Group>
      </Group>

      {/* Data Table */}
      <ScrollArea>
        <Table striped highlightOnHover className="min-w-max">
          <Table.Thead>
            <Table.Tr className="bg-gray-100">
              {columns.map((col) => (
                <Table.Th
                  key={col}
                  className="px-3 py-2 font-semibold text-gray-800"
                >
                  {col}
                </Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {sample.sample.map((row, rowIndex) => (
              <Table.Tr
                key={rowIndex}
                className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}
              >
                {columns.map((col) => (
                  <Table.Td
                    key={`${rowIndex}-${col}`}
                    className="px-3 py-2 max-w-xs overflow-hidden text-ellipsis"
                  >
                    <Tooltip label={String(row[col] ?? '')}>
                      <Text size="sm" c="dim" className="truncate">
                        {row[col] !== null && row[col] !== undefined
                          ? String(row[col])
                          : '—'}
                      </Text>
                    </Tooltip>
                  </Table.Td>
                ))}
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Stack>
  )
}

function Step3Datasets({ datasets_data }: Step3DatasetsType) {
  // Get list of dataset IDs
  const datasetIds = useMemo(
    () => Object.keys(datasets_data || {}),
    [datasets_data],
  )

  return (
    <Stack gap="lg" className="w-full">
      {/* Header */}
      <Group gap="xs">
        <ThemeIcon
          size="lg"
          radius="md"
          variant="gradient"
          gradient={{ from: 'teal', to: 'cyan' }}
        >
          <IconTable size={20} />
        </ThemeIcon>
        <div className="flex-1">
          <Text size="lg" fw={700}>
            Dataset Samples
          </Text>
          <Text size="sm" c="dimmed">
            {datasetIds.length} dataset{datasetIds.length !== 1 ? 's' : ''} with
            sample data
          </Text>
        </div>
      </Group>

      {/* Datasets List */}
      {datasetIds.length === 0 ? (
        <Card withBorder p="lg" radius="md" className="bg-gray-50">
          <Group justify="center" gap="xs" className="py-8">
            <IconAlertCircle size={20} className="text-gray-500" />
            <Text c="dimmed">No dataset samples available</Text>
          </Group>
        </Card>
      ) : (
        <Accordion defaultValue={datasetIds[0]} multiple={false}>
          {datasetIds.map((datasetId, index) => {
            const sample = datasets_data[datasetId]
            return (
              <Accordion.Item key={datasetId} value={datasetId}>
                <Accordion.Control>
                  <Group justify="space-between" className="flex-1 pr-4">
                    <Group gap="xs">
                      <Badge size="sm" variant="light" color="blue">
                        Dataset {index + 1}
                      </Badge>
                      <Text size="sm" fw={500}>
                        {datasetId}
                      </Text>
                    </Group>
                    <Group gap="xs" className="ml-auto">
                      <Badge size="xs" variant="light" color="teal">
                        {sample.row_count} rows
                      </Badge>
                    </Group>
                  </Group>
                </Accordion.Control>
                <Accordion.Panel>
                  <Stack gap="md" className="mt-4">
                    <Divider />
                    <DatasetTable sample={sample} />
                  </Stack>
                </Accordion.Panel>
              </Accordion.Item>
            )
          })}
        </Accordion>
      )}
    </Stack>
  )
}

export default React.memo(Step3Datasets)
