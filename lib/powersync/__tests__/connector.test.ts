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

  it('drops permanently rejected 403 / 42501 operations without throwing to avoid head-of-line blocking', async () => {
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
});
