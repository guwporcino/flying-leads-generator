import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';

/** Marca uma rota como fora da autenticação — ver ADR 0014. Hoje só /health. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
