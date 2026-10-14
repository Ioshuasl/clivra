/**
 * Ciclo de abertura/fechamento de caixa desativado no produto.
 * Serviços/repositórios de open/close permanecem no código para reativação futura.
 * Quando `false`: POST open/close/movements retornam desativado; pagamentos CASH
 * não exigem sessão aberta.
 */
export const CASH_SESSION_LIFECYCLE_ENABLED = false;
