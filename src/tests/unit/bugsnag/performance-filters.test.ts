import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BugsnagClient } from '../../../bugsnag/client.js';
import type { PerformanceFilter } from '../../../bugsnag/client/api/index.js';

describe('BugsnagClient Performance Filter Schema', () => {
  let client: BugsnagClient;
  let mockProjectApi: any;

  beforeEach(() => {
    mockProjectApi = {
      listProjectSpanGroups: vi.fn(),
      getProjectSpanGroup: vi.fn(),
      getProjectSpanGroupTimeline: vi.fn(),
      getProjectSpanGroupDistribution: vi.fn(),
      listSpansBySpanGroupId: vi.fn(),
    };

    client = new BugsnagClient('mock-token', 'mock-project-key');
    (client as any).projectApi = mockProjectApi;
    (client as any).getInputProject = vi.fn().mockResolvedValue({ id: 'test-project' });
  });

  it('should pass filters in correct format to listSpanGroups', async () => {
    const mockResponse = { body: [], nextUrl: null };
    mockProjectApi.listProjectSpanGroups.mockResolvedValue(mockResponse);

    const filters: PerformanceFilter[] = [
      {
        key: 'device.browser_name',
        filterValues: [{ matchType: 'eq' as any, value: 'Chrome' }]
      },
      {
        key: 'os.name', 
        filterValues: [{ matchType: 'ne' as any, value: 'iOS' }]
      }
    ];

    await client.listSpanGroups(
      'test-project',
      'name',
      'asc',
      10,
      0,
      filters
    );

    expect(mockProjectApi.listProjectSpanGroups).toHaveBeenCalledWith(
      'test-project',
      'name',
      'asc',
      10,
      0,
      filters,
      undefined,
      undefined
    );
  });

  it('should pass filters in correct format to getSpanGroup', async () => {
    const mockResponse = { body: {} };
    mockProjectApi.getProjectSpanGroup.mockResolvedValue(mockResponse);

    const filters: PerformanceFilter[] = [
      {
        key: 'span_group.category',
        filterValues: [{ matchType: 'eq' as any, value: 'full_page_load' }]
      }
    ];

    await client.getSpanGroup(
      'test-project', 
      'test-span-group',
      filters
    );

    expect(mockProjectApi.getProjectSpanGroup).toHaveBeenCalledWith(
      'test-project',
      'test-span-group',
      filters
    );
  });

  it('should pass filters in correct format to listSpansBySpanGroupId', async () => {
    const mockResponse = { body: [], nextUrl: null };
    mockProjectApi.listSpansBySpanGroupId.mockResolvedValue(mockResponse);

    const filters: PerformanceFilter[] = [
      {
        key: 'user.id',
        filterValues: [
          { matchType: 'eq' as any, value: 'user123' },
          { matchType: 'eq' as any, value: 'user456' }
        ]
      }
    ];

    await client.listSpansBySpanGroupId(
      'test-project',
      'test-span-group',
      filters,
      'duration',
      'desc',
      20
    );

    expect(mockProjectApi.listSpansBySpanGroupId).toHaveBeenCalledWith(
      'test-project',
      'test-span-group',
      filters,
      'duration',
      'desc',
      20,
      undefined
    );
  });
});