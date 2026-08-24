import { Connector } from '../Connector';
import { UpdateType } from '@powersync/react-native';
import { supabase } from '@/lib/supabase';

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe('PowerSync Connector - Upload Data & Error Handling', () => {
  let connector: Connector;

  beforeEach(() => {
    jest.clearAllMocks();
    connector = new Connector();
  });

  it('drops permanently rejected 42501 RLS operations without throwing to avoid head-of-line blocking', async () => {
    const mockComplete = jest.fn().mockResolvedValue(undefined);
    const mockDatabase = {
      getNextCrudTransaction: jest.fn().mockResolvedValue({
        crud: [
          {
            table: 'drawings',
            op: UpdateType.DELETE,
            id: 'unauthorized-drawing-id',
            opData: null,
          },
        ],
        complete: mockComplete,
      }),
    };

    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: {
          code: '42501',
          message: 'new row violates row-level security policy for table "drawings"',
          status: 403,
        },
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      delete: mockDelete,
    });

    // Should complete the transaction without rethrowing
    await expect(connector.uploadData(mockDatabase as any)).resolves.toBeUndefined();
    expect(mockComplete).toHaveBeenCalledTimes(1);
  });

  it('rethrows transient JWT auth errors (PGRST301) so PowerSync will retry on token refresh', async () => {
    const mockComplete = jest.fn().mockResolvedValue(undefined);
    const mockDatabase = {
      getNextCrudTransaction: jest.fn().mockResolvedValue({
        crud: [
          {
            table: 'drawings',
            op: UpdateType.DELETE,
            id: 'drawing-id-jwt-fail',
            opData: null,
          },
        ],
        complete: mockComplete,
      }),
    };

    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: {
          code: 'PGRST301',
          message: 'JWT expired',
          status: 401,
        },
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      delete: mockDelete,
    });

    // Must re-throw so it retries, never silently drop
    await expect(connector.uploadData(mockDatabase as any)).rejects.toEqual(
      expect.objectContaining({ code: 'PGRST301' })
    );
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('rethrows transient or network errors so PowerSync will retry later', async () => {
    const mockComplete = jest.fn().mockResolvedValue(undefined);
    const mockDatabase = {
      getNextCrudTransaction: jest.fn().mockResolvedValue({
        crud: [
          {
            table: 'drawings',
            op: UpdateType.PUT,
            id: 'valid-drawing-id',
            opData: { name: 'Plan.pdf' },
          },
        ],
        complete: mockComplete,
      }),
    };

    const mockUpsert = jest.fn().mockResolvedValue({
      error: {
        code: '500',
        message: 'Internal server error / network timeout',
        status: 500,
      },
    });

    (supabase.from as jest.Mock).mockReturnValue({
      upsert: mockUpsert,
    });

    await expect(connector.uploadData(mockDatabase as any)).rejects.toEqual(
      expect.objectContaining({ status: 500 })
    );
    expect(mockComplete).not.toHaveBeenCalled();
  });

  it('drops unauthorized 42501 DELETE on projects table to prevent head-of-line blocking', async () => {
    const mockComplete = jest.fn().mockResolvedValue(undefined);
    const mockDatabase = {
      getNextCrudTransaction: jest.fn().mockResolvedValue({
        crud: [
          {
            table: 'projects',
            op: UpdateType.DELETE,
            id: 'unauthorized-project-id',
            opData: null,
          },
        ],
        complete: mockComplete,
      }),
    };

    const mockDelete = jest.fn().mockReturnValue({
      eq: jest.fn().mockResolvedValue({
        error: {
          code: '42501',
          message: 'new row violates row-level security policy for table "projects"',
          status: 403,
        },
      }),
    });

    (supabase.from as jest.Mock).mockReturnValue({
      delete: mockDelete,
    });

    // Should complete the transaction and drop the rejected delete operation
    await expect(connector.uploadData(mockDatabase as any)).resolves.toBeUndefined();
    expect(mockComplete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledTimes(1);
  });
});
