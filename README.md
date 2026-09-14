# Family Finance — autenticação por usuário e senha

Esta é a base reconstruída e homologada do Family Finance.

## Acesso
O usuário final usa somente:
- nome de usuário;
- senha.

Não há campo de e-mail no cadastro, login, perfil, Família ou migração do sistema antigo.

O Supabase Auth exige internamente um identificador de autenticação. Para manter o Auth oficial e o RLS por `auth.uid()` sem pedir dados pessoais adicionais, o backend cria um identificador técnico não entregável e invisível. Ele nunca é mostrado nem digitado pelo usuário.

Funções implantadas no Supabase:
- `ff-username-signup`: cria a conta por usuário/senha, com limite de cadastros por origem;
- `ff-username-login`: autentica por usuário/senha;
- `ff-username-finalize`: converte contas de teste anteriores para a identidade técnica oculta.

## Família
Os convites agora são enviados pelo nome de usuário. A tabela `ff2_family_invites` referencia diretamente o UUID Auth do convidado e não possui coluna de e-mail.

## Migração antiga
Em Configurações → Trazer dados do Family Finance antigo, a pessoa informa apenas o usuário e a senha antigos. O banco valida o hash legado e transfere os dados para o `auth.uid()` atual.

## Segurança
- Supabase Auth oficial;
- RLS baseado em `auth.uid()`;
- chave pública moderna no navegador;
- chaves privilegiadas somente no backend/Edge Functions;
- cadastro público limitado a 5 tentativas por hora por origem;
- senha nunca é armazenada no frontend ou nas tabelas públicas.

## PWA
Manifesto, ícones e Service Worker estão ativos. O shell pode abrir pelo cache; gravações e sincronizações financeiras continuam exigindo conexão.

## Publicação
Publique todo o conteúdo deste pacote no repositório de teste. As mudanças de banco e as Edge Functions já foram aplicadas no Supabase.

## Atualização de iconografia
- Sidebar desktop: ícones vetoriais claros para Início, Lançamentos, Cartões, Metas, Orçamento, Família, Configurações e Sair.
- Dashboard: ícones vetoriais em Ajustar saldo, Novo lançamento, DRE, PDF, Receitas, Despesas, Cartão no mês, Próximas faturas, Metas e Orçamento.
- Navegação mobile: mesmos ícones do desktop para manter reconhecimento visual.
- Não depende de biblioteca externa de ícones; os SVGs ficam no próprio HTML e funcionam offline.


Correção adicional: os ícones de Próximas faturas, Metas e Orçamento agora usam stroke SVG corretamente, sem placeholders pretos.


## Proteção do histórico de lançamentos
- Lançamentos abre em **Todos os períodos**; mudar o mês do dashboard não altera mais o filtro do histórico.
- `ff2_transactions` é carregada em páginas de 500 registros até o fim.
- A contagem exata do banco é conferida antes e depois da leitura. A lista só é aceita quando contagem, quantidade carregada e IDs únicos conferem.
- Se houver mudança concorrente ou leitura incompleta, a sincronização é refeita automaticamente uma vez. Persistindo divergência, a lista anterior é mantida e o app mostra erro, evitando ocultar registros silenciosamente.
- A ordem visual permanece: data do lançamento mais recente primeiro; empates por criação e ID.
