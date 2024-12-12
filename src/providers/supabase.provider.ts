// src/providers/supabase.provider.ts
import { createClient } from '@supabase/supabase-js';
import { ConfigService } from '@nestjs/config';

export const SupabaseProvider = {
  provide: 'SUPABASE_CLIENT',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    return createClient(
      configService.get('supabase.url'),
      configService.get('supabase.key'),
    );
  },
};
