PACOTE DE CORREÇÃO DE LOGIN - HTML ÚNICO

Use este pacote para estabilizar o app caso a separação em css/js tenha causado problema na publicação.

Substitua no GitHub:
- index.html
- sw.js

Não precisa subir as pastas css/ e js/ para esta versão.

Depois de publicar:
1. Abra o link HTTPS do GitHub Pages.
2. Não abra o arquivo baixado em content:// ou Downloads.
3. Se tiver instalado como app/PWA, remova o app antigo e instale novamente.
4. No Chrome, recarregue 2 vezes para trocar o cache do service worker.

Se ainda aparecer Failed to fetch em HTTPS, o problema está na conexão com Supabase, no projeto Supabase ou no bloqueio de rede do aparelho.
