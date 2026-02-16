import {
  Accordion,
  Anchor,
  Badge,
  Box,
  Card,
  Divider,
  Group,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Tabs,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core'
import {
  IconCalendar,
  IconChartBar,
  IconDatabase,
  IconHash,
  IconLetterCase,
  IconLink,
  IconMap,
  IconMapPin,
  IconTag,
  IconTrendingUp,
  IconUser,
} from '@tabler/icons-react'
import React from 'react'
import { GeoDatasetMiniMap } from '../components/GeoDatasetMiniMap'
import { GeoVisualization } from '../components/GeoVisualization'
import type {
  DatasetResponse,
  FieldDate,
  FieldNumeric,
  FieldString,
} from '../types'

function Step2VectorSearch({ datasets }: { datasets: DatasetResponse[] }) {
  // DEBUG: Log incoming datasets
  console.log('Step2VectorSearch received datasets:', datasets)
  console.log('First dataset:', datasets[0])
  console.log('First dataset metadata:', datasets[0]?.metadata)
  console.log('First dataset web_services:', datasets[0]?.web_services)

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'N/A'
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatNumber = (num: number, decimals = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    })
  }

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'Numeric':
        return <IconHash size={16} />
      case 'String':
        return <IconLetterCase size={16} />
      case 'Date':
        return <IconCalendar size={16} />
      default:
        return <IconDatabase size={16} />
    }
  }

  const renderFieldDetails = (
    field: FieldNumeric | FieldString | FieldDate,
  ) => {
    if (field.type === 'Numeric') {
      const numField = field as FieldNumeric
      const quantileItems = [
        ['Min', numField.quantile_0_min],
        ['25%', numField.quantile_25],
        ['Median', numField.quantile_50_median],
        ['75%', numField.quantile_75],
        ['Max', numField.quantile_100_max],
      ].filter(([, value]) => value !== undefined && value !== null)

      return (
        <Stack gap="xs">
          {numField.mean && (
            <Group gap="xs" wrap="nowrap">
              <Text size="xs" c="dimmed" className="min-w-24">
                Mean:
              </Text>
              <Text size="xs" fw={500}>
                {formatNumber(numField.mean)}
              </Text>
            </Group>
          )}
          {numField.std && (
            <Group gap="xs" wrap="nowrap">
              <Text size="xs" c="dimmed" className="min-w-24">
                Std Dev:
              </Text>
              <Text size="xs" fw={500}>
                {formatNumber(numField.std)}
              </Text>
            </Group>
          )}
          <Divider size="xs" className="my-1" />
          <Text size="xs" fw={600} c="blue">
            Quantiles
          </Text>
          {quantileItems.length > 0 && (
            <Group gap="md" wrap="wrap">
              {quantileItems.map(([label, value]) => (
                <Group key={label} gap={4} wrap="nowrap">
                  <Text size="xs" c="dimmed">
                    {label}:
                  </Text>
                  <Text size="xs">{formatNumber(value as number)}</Text>
                </Group>
              ))}
            </Group>
          )}
          {numField.distribution && (
            <Box>
              <Text size="xs" c="dimmed">
                Distribution:
              </Text>
              <Text size="xs" className="font-mono">
                {numField.distribution}
              </Text>
            </Box>
          )}
        </Stack>
      )
    } else if (field.type === 'String') {
      const stringField = field as FieldString
      const topValues = stringField.top_values
        ? Object.entries(stringField.top_values)
        : []

      if (topValues.length === 0) return null

      return (
        <Stack gap="xs">
          <Text size="xs" fw={600} c="blue">
            Unique values
          </Text>
          <Group gap={6} wrap="wrap">
            {topValues.map(([value, count]) => (
              <Tooltip key={value} label={`${count.toLocaleString()} rows`}>
                <Badge size="sm" variant="light" color="gray">
                  {value}
                </Badge>
              </Tooltip>
            ))}
          </Group>
        </Stack>
      )
    } else if (field.type === 'Date') {
      const dateField = field as FieldDate
      return (
        <Stack gap="xs">
          {dateField.min && (
            <Group gap="xs">
              <Text size="xs" c="dimmed" className="min-w-24">
                Min Date:
              </Text>
              <Text size="xs" fw={500}>
                {formatDate(dateField.min)}
              </Text>
            </Group>
          )}
          {dateField.max && (
            <Group gap="xs">
              <Text size="xs" c="dimmed" className="min-w-24">
                Max Date:
              </Text>
              <Text size="xs" fw={500}>
                {formatDate(dateField.max)}
              </Text>
            </Group>
          )}
          {dateField.mean && (
            <Group gap="xs">
              <Text size="xs" c="dimmed" className="min-w-24">
                Mean Date:
              </Text>
              <Text size="xs" fw={500}>
                {formatDate(dateField.mean)}
              </Text>
            </Group>
          )}
        </Stack>
      )
    }
    return null
  }

  return (
    <Stack gap="md" className="w-full">
      <Group justify="space-between" className="mb-2">
        <Group gap="xs">
          <Badge
            size="lg"
            variant="light"
            color="pink"
            leftSection={<IconDatabase size={14} />}
          >
            Datasets
          </Badge>
          <Badge size="lg" variant="filled" color="gray">
            {datasets.length} Results
          </Badge>
        </Group>
      </Group>

      <Tabs variant="default" defaultValue="map">
        <Tabs.List>
          <Tabs.Tab
            value="map"
            leftSection={<IconMap size={16} />}
            disabled={!datasets.some((d) => d.metadata.is_geo)}
          >
            Map View
          </Tabs.Tab>
          <Tabs.Tab value="list" leftSection={<IconDatabase size={16} />}>
            List View ({datasets.length})
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="map" pt="md">
          <GeoVisualization
            datasets={datasets.map((d) => ({
              id: d.metadata.id,
              title: d.metadata.title,
              is_geo: d.metadata.is_geo,
              web_services: d.web_services,
              city: d.metadata.city,
              state: d.metadata.state,
              country: d.metadata.country,
              score: d.score,
            }))}
          />
        </Tabs.Panel>

        <Tabs.Panel value="list" pt="md">
          <Stack gap="lg">
            {datasets.map((dataset, index) => (
              <Card
                key={dataset.metadata.id}
                shadow="sm"
                padding="lg"
                radius="md"
                withBorder
                className="hover:shadow-md transition-shadow duration-200 gap-3"
              >
                {/* Header with Score */}
                <Group justify="space-between" className="mb-3">
                  <Group gap="xs">
                    <ThemeIcon
                      size="lg"
                      radius="md"
                      variant="light"
                      color="blue"
                    >
                      <Text size="sm" fw={700}>
                        #{index + 1}
                      </Text>
                    </ThemeIcon>
                    <Text size="lg" fw={600} className="max-w-2xl truncate">
                      {dataset.metadata.title}
                    </Text>
                    {dataset.metadata.is_geo && (
                      <Tooltip label="Geographic dataset with WFS services">
                        <Badge
                          size="sm"
                          variant="light"
                          color="teal"
                          leftSection={<IconMap size={12} />}
                        >
                          GEO
                        </Badge>
                      </Tooltip>
                    )}
                  </Group>
                  <Tooltip label="Relevance Score">
                    <Badge
                      size="lg"
                      variant="gradient"
                      gradient={{ from: 'teal', to: 'lime', deg: 105 }}
                      leftSection={<IconTrendingUp size={14} />}
                    >
                      {(dataset.score * 100).toFixed(1)}%
                    </Badge>
                  </Tooltip>
                </Group>

                {/* Description */}
                {dataset.metadata.description && (
                  <Text size="sm" c="dimmed" className="mb-3 line-clamp-2">
                    {dataset.metadata.description}
                  </Text>
                )}

                {/* Metadata Grid */}
                <Paper
                  p="sm"
                  radius="sm"
                  withBorder
                  className="mb-3 bg-gray-50"
                >
                  <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="sm">
                    {dataset.metadata.organization && (
                      <Group gap="xs" wrap="nowrap">
                        <IconUser size={16} className="text-gray-500" />
                        <Text size="xs" c="dimmed">
                          Org:
                        </Text>
                        <Text size="xs" fw={500} className="truncate">
                          {dataset.metadata.organization}
                        </Text>
                      </Group>
                    )}

                    {dataset.metadata.author && (
                      <Group gap="xs" wrap="nowrap">
                        <IconUser size={16} className="text-gray-500" />
                        <Text size="xs" c="dimmed">
                          Author:
                        </Text>
                        <Text size="xs" fw={500} className="truncate">
                          {dataset.metadata.author}
                        </Text>
                      </Group>
                    )}

                    {/* Location */}
                    {(dataset.metadata.city ||
                      dataset.metadata.state ||
                      dataset.metadata.country) && (
                      <Group gap="xs" wrap="nowrap">
                        <IconMapPin size={16} className="text-gray-500" />
                        <Text size="xs" c="dimmed">
                          Location:
                        </Text>
                        <Text size="xs" fw={500} className="truncate">
                          {[
                            dataset.metadata.city,
                            dataset.metadata.state,
                            dataset.metadata.country,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </Text>
                      </Group>
                    )}

                    {dataset.metadata.metadata_created && (
                      <Group gap="xs" wrap="nowrap">
                        <IconCalendar size={16} className="text-gray-500" />
                        <Text size="xs" c="dimmed">
                          Created:
                        </Text>
                        <Text size="xs" fw={500}>
                          {formatDate(dataset.metadata.metadata_created)}
                        </Text>
                      </Group>
                    )}

                    {dataset.metadata.metadata_modified && (
                      <Group gap="xs" wrap="nowrap">
                        <IconCalendar size={16} className="text-gray-500" />
                        <Text size="xs" c="dimmed">
                          Modified:
                        </Text>
                        <Text size="xs" fw={500}>
                          {formatDate(dataset.metadata.metadata_modified)}
                        </Text>
                      </Group>
                    )}

                    {dataset.metadata.url && (
                      <Group gap="xs" wrap="nowrap">
                        <IconLink size={16} className="text-gray-500" />
                        <Anchor
                          href={dataset.metadata.url}
                          target="_blank"
                          size="xs"
                          className="truncate"
                        >
                          View Dataset
                        </Anchor>
                      </Group>
                    )}
                  </SimpleGrid>
                </Paper>

                {/* Tags */}
                {dataset.metadata.tags && dataset.metadata.tags.length > 0 && (
                  <Group gap={4}>
                    <IconTag size={16} className="text-gray-500" />
                    {dataset.metadata.tags.map((tag) => (
                      <Badge key={tag} size="sm" variant="dot" color="blue">
                        {tag}
                      </Badge>
                    ))}
                  </Group>
                )}

                {/* Web Services */}
                {dataset.web_services && dataset.web_services.length > 0 && (
                  <Box
                    className="bg-blue-50 border border-blue-200 rounded-lg shadow-sm"
                    style={{
                      padding: '20px',
                      marginTop: '24px',
                      marginBottom: '12px',
                    }}
                  >
                    <Group gap="xs" className="mb-3">
                      <IconLink size={18} className="text-blue-600" />
                      <Text size="sm" fw={700} c="blue">
                        Web Services ({dataset.web_services.length})
                      </Text>
                    </Group>
                    <Stack gap="sm">
                      {dataset.web_services.map((service, serviceIdx) => (
                        <Box
                          key={serviceIdx}
                          className="bg-white rounded-md border border-gray-200 hover:shadow-sm transition-shadow"
                          style={{ padding: '16px' }}
                        >
                          <Group justify="space-between" gap="xs">
                            <Stack gap={3} className="flex-1">
                              <Text size="sm" fw={600} c="gray">
                                {service.name}
                              </Text>
                              <Badge size="sm" variant="light" color="blue">
                                {service.format}
                              </Badge>
                              {service.description && (
                                <Text size="xs" c="dimmed" lineClamp={1}>
                                  {service.description}
                                </Text>
                              )}
                            </Stack>
                            <Anchor
                              href={service.url}
                              target="_blank"
                              size="sm"
                              fw={600}
                              className="whitespace-nowrap"
                            >
                              View →
                            </Anchor>
                          </Group>
                        </Box>
                      ))}
                    </Stack>
                  </Box>
                )}

                {/* Mini Map for Geographic Datasets */}
                {dataset.metadata.is_geo &&
                  dataset.web_services &&
                  dataset.web_services.length > 0 && (
                    <Box className="mt-3">
                      <Text size="xs" fw={600} c="dark" className="mb-2">
                        Data Preview
                      </Text>
                      <GeoDatasetMiniMap
                        title={dataset.metadata.title}
                        web_services={dataset.web_services}
                        height={300}
                      />
                    </Box>
                  )}

                {/* Groups */}
                {dataset.metadata.groups &&
                  dataset.metadata.groups.length > 0 && (
                    <Group gap={4} className="mb-3">
                      <Text size="xs" c="dimmed">
                        Groups:
                      </Text>
                      {Array.from(new Set(dataset.metadata.groups)).map(
                        (group) => (
                          <Badge
                            key={group}
                            size="sm"
                            variant="outline"
                            color="grape"
                          >
                            {group}
                          </Badge>
                        ),
                      )}
                    </Group>
                  )}

                {/* Fields Accordion */}
                {dataset.metadata.fields &&
                  Object.keys(dataset.metadata.fields).length > 0 && (
                    <Accordion
                      variant="contained"
                      radius="md"
                      chevronPosition="right"
                    >
                      <Accordion.Item value="fields">
                        <Accordion.Control icon={<IconChartBar size={20} />}>
                          <Group gap="xs">
                            <Text fw={500}>Dataset Fields</Text>
                            <Badge size="sm" variant="light" color="cyan">
                              {Object.keys(dataset.metadata.fields).length}{' '}
                              fields
                            </Badge>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <ScrollArea className="max-h-96 overflow-y-scroll!">
                            <Stack gap="md">
                              {Object.entries(dataset.metadata.fields).map(
                                ([fieldName, field]) => (
                                  <Paper
                                    key={fieldName}
                                    p="md"
                                    radius="sm"
                                    withBorder
                                  >
                                    <Group
                                      justify="space-between"
                                      className="mb-2"
                                    >
                                      <Group gap="xs">
                                        {getFieldIcon(field.type)}
                                        <Text fw={600} size="sm">
                                          {fieldName}
                                        </Text>
                                        <Badge
                                          size="xs"
                                          variant="light"
                                          color="blue"
                                        >
                                          {field.type}
                                        </Badge>
                                      </Group>
                                      <Group gap="xs">
                                        <Tooltip label="Unique Values">
                                          <Badge
                                            size="sm"
                                            variant="outline"
                                            color="green"
                                          >
                                            {field.unique_count.toLocaleString()}{' '}
                                            unique
                                          </Badge>
                                        </Tooltip>
                                        {field.null_count > 0 && (
                                          <Tooltip label="Null Values">
                                            <Badge
                                              size="sm"
                                              variant="outline"
                                              color="red"
                                            >
                                              {field.null_count.toLocaleString()}{' '}
                                              nulls
                                            </Badge>
                                          </Tooltip>
                                        )}
                                      </Group>
                                    </Group>

                                    {/* Null percentage bar */}
                                    {field.null_count > 0 &&
                                      field.unique_count > 0 && (
                                        <Box className="mb-2">
                                          <Text
                                            size="xs"
                                            c="dimmed"
                                            className="mb-1"
                                          >
                                            Data Completeness
                                          </Text>
                                          <Progress
                                            value={
                                              ((field.unique_count -
                                                field.null_count) /
                                                field.unique_count) *
                                              100
                                            }
                                            size="sm"
                                            radius="xl"
                                            color="teal"
                                          />
                                        </Box>
                                      )}

                                    {renderFieldDetails(field)}
                                  </Paper>
                                ),
                              )}
                            </Stack>
                          </ScrollArea>
                        </Accordion.Panel>
                      </Accordion.Item>
                    </Accordion>
                  )}
              </Card>
            ))}
          </Stack>
        </Tabs.Panel>
      </Tabs>
    </Stack>
  )
}

export default React.memo(Step2VectorSearch)
