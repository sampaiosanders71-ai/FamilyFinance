(() => {
  const HELP = {
    inicio: {
      title: 'Sobre o Início',
      intro: 'O Início reúne os principais números do mês e atalhos para as áreas mais usadas do Family Finance.',
      bullets: ['Acompanhe saldo atual, receitas, despesas pagas e resultado de caixa.', 'Compras no cartão aparecem na fatura, mas só entram nas despesas pagas do Dashboard quando a fatura é quitada.', 'Investido / reservado soma as destinações realizadas no mês; as metas mostram o saldo acumulado informado em cada objetivo.', 'Os limites consideram somente categorias com teto definido; valores sem limite são mostrados à parte.', 'Últimos lançamentos acompanha o mês selecionado. Clique em uma fatura ou meta para abrir seus detalhes.', 'Faturas abertas continuam reduzindo o saldo previsto porque representam compromissos futuros.']
    },
    lancamentos: {
      title: 'Sobre Lançamentos',
      intro: 'Lançamentos é o histórico financeiro real da sua conta.',
      bullets: ['Receitas aumentam o saldo e despesas reduzem o saldo.', 'Você pode pesquisar, filtrar, editar ou excluir movimentações.', 'Pagamentos e recebimentos confirmados no Planejamento também aparecem aqui como lançamentos reais.']
    },
    cartoes: {
      title: 'Sobre Cartões',
      intro: 'Use Cartões para controlar compras no crédito, parcelas, faturas e pagamentos.',
      bullets: ['Compras entram na fatura conforme a competência do cartão e já contam nos limites e análises de consumo.', 'Enquanto a fatura estiver aberta, ela não é tratada como despesa paga no Dashboard.', 'Ao marcar a fatura como paga, o pagamento vira saída real de caixa; ao reabrir, essa saída é revertida.', 'Compras de uma fatura já paga só podem ser alteradas depois que a fatura for reaberta.']
    },
    metas: {
      title: 'Sobre Metas',
      intro: 'Metas servem para acompanhar objetivos financeiros ao longo do tempo.',
      bullets: ['Defina um valor-alvo e acompanhe o progresso.', 'Metas não substituem limites ou planejamento mensal.', 'Use-as para objetivos como reserva, viagem, compra ou formação de patrimônio.']
    },
    planejamento: {
      title: 'Sobre Planejamento',
      intro: 'Planejamento separa o que você pretende receber ou pagar do que já aconteceu de verdade.',
      bullets: ['Visão geral resume o mês.', 'Meus planos reúne receitas e despesas previstas.', 'Limites compara o teto das categorias com gastos realizados e valores ainda planejados.', 'Quando um plano é pago ou recebido, ele passa a ser um lançamento real.']
    },
    analises: {
      title: 'Sobre Análises',
      intro: 'Análises compara períodos e mostra como seu comportamento financeiro mudou.',
      bullets: ['Compare meses ou anos.', 'Veja evolução, categorias, planejamento, limites e cartões.', 'Cores, nomes e ícones das categorias seguem o gerenciador de Categorias.']
    },
    familia: {
      title: 'Sobre Família',
      intro: 'Família permite compartilhar informações financeiras apenas com pessoas autorizadas.',
      bullets: ['Você decide quais dados cada pessoa pode visualizar.', 'Quem recebeu autorização pode acompanhar os períodos liberados.', 'Permissões podem ser alteradas ou removidas a qualquer momento.']
    },
    configuracoes: {
      title: 'Sobre Configurações',
      intro: 'Configurações concentra as preferências e ferramentas administrativas do Family Finance.',
      bullets: ['Conta e aparência.', 'Instalação do app.', 'Categorias.', 'Backup e migração.', 'Encerramento da sessão.']
    },
    conta: {
      title: 'Sobre Conta',
      intro: 'Nesta página você ajusta os dados do perfil e a aparência do Family Finance.',
      bullets: ['O nome exibido pode ser alterado sem mudar seu usuário.', 'O tema pode seguir o sistema ou ser definido como claro ou escuro.']
    },
    instalar: {
      title: 'Sobre Instalar o app',
      intro: 'Instalar o Family Finance cria um atalho no dispositivo e permite abrir o sistema como aplicativo.',
      bullets: ['A disponibilidade depende do navegador e do dispositivo.', 'A instalação não altera seus dados financeiros.']
    },
    backup: {
      title: 'Sobre Backup',
      intro: 'Esta área reúne recuperação e migração dos dados da versão anterior.',
      bullets: ['A migração copia os registros antigos para a conta atual.', 'Os dados atuais não são apagados durante o processo.']
    },
    categorias: {
      title: 'Sobre Categorias',
      intro: 'Categorias é a fonte central usada por lançamentos, cartões, planejamento, limites e análises.',
      bullets: ['Você pode criar, renomear, ocultar e personalizar categorias.', 'Ocultar impede novos usos, mas preserva o histórico.', 'Ícone e cor acompanham a categoria nas outras áreas do app.']
    },
    sair: {
      title: 'Sobre Sair',
      intro: 'Sair encerra a sessão neste dispositivo.',
      bullets: ['Seus dados permanecem preservados.', 'Será necessário entrar novamente para acessar sua conta.']
    },
    'planning-limits': {
      title: 'Como funcionam os limites?',
      intro: 'Limites definem quanto você aceita gastar em cada categoria durante o mês.',
      bullets: ['O limite é o teto da categoria.', 'Gasto realizado mostra o que já virou lançamento real.', 'Planejado mostra valores pendentes que ainda não foram realizados.', 'Disponível considera o limite menos o que já foi gasto e o que ainda está planejado.']
    },
    'planning-layered-limits': {
      title: 'Como ler a barra em camadas?',
      intro: 'A barra compara gasto realizado e planejamento pendente usando o mesmo limite como referência.',
      bullets: ['Cinza representa 100% do limite.', 'Laranja vivo representa o gasto realizado.', 'A outra camada laranja representa o valor planejado ainda pendente.', 'As camadas são independentes: aumentar um gasto não aumenta o planejamento, e vice-versa.'],
      note: 'Quando um plano é realizado, ele deixa de ser pendente e passa a compor o gasto real da categoria.'
    },
    'budget-suggestion': {
      title: 'Como funciona a Sugestão de limites?',
      intro: 'O Family Finance usa o histórico recente para propor limites mais próximos do seu comportamento real.',
      bullets: ['A análise considera até os 3 meses anteriores.', 'A referência usa gastos realizados, não planejamentos pendentes.', 'A sugestão inclui uma margem de segurança.', 'Nada é alterado até você confirmar em Aplicar sugestões.']
    },
    'centralized-categories': {
      title: 'Categorias centralizadas',
      intro: 'Os limites usam as mesmas categorias configuradas no restante do app.',
      bullets: ['Crie, edite, oculte ou restaure categorias em Configurações → Categorias.', 'Alterações de nome, cor e ícone são refletidas nas demais áreas sem apagar o histórico.']
    },
    'categories-active': {
      title: 'Categorias ativas',
      intro: 'Categorias ativas ficam disponíveis para novos registros em todo o Family Finance.',
      bullets: ['Podem ser usadas em lançamentos, planejamento, cartões e limites.', 'Ocultar uma categoria não apaga o histórico já registrado.']
    },
    'categories-hidden': {
      title: 'Categorias ocultas',
      intro: 'Categorias ocultas deixam de aparecer em novos registros, mas continuam existindo no histórico.',
      bullets: ['Você pode restaurá-las quando quiser.', 'Lançamentos antigos permanecem associados à categoria.']
    },
    'categories-limits': {
      title: 'Categorias usadas nos Limites',
      intro: 'Somente categorias de despesa ativas podem receber novos limites mensais.',
      bullets: ['Se uma categoria for ocultada, o histórico dos limites anteriores permanece preservado.', 'Para voltar a usá-la em novos limites, restaure-a em Categorias.']
    },
    geral: {
      title: 'Ajuda do Family Finance',
      intro: 'Use os ícones de interrogação para consultar explicações sem manter textos longos ocupando espaço na interface.'
    }
  };

  const TITLE_KEYS = {
    'Início': 'inicio',
    'Lançamentos': 'lancamentos',
    'Cartões': 'cartoes',
    'Metas': 'metas',
    'Planejamento': 'planejamento',
    'Análises': 'analises',
    'Família': 'familia',
    'Configurações': 'configuracoes',
    'Conta': 'conta',
    'Instalar o app': 'instalar',
    'Backup': 'backup',
    'Categorias': 'categorias',
    'Sair': 'sair'
  };

  const dialog = document.getElementById('context-help-dialog');
  const title = document.getElementById('context-help-title');
  const body = document.getElementById('context-help-body');
  const close = document.getElementById('context-help-close');
  if (!dialog || !title || !body) return;

  function currentPageKey() {
    const suggestion = document.getElementById('budget-suggestion-page');
    if (suggestion && !suggestion.classList.contains('hidden')) return 'budget-suggestion';
    const pageTitle = document.getElementById('page-title')?.textContent?.trim() || '';
    return TITLE_KEYS[pageTitle] || 'geral';
  }

  function render(entry) {
    title.textContent = entry.title;
    body.replaceChildren();
    if (entry.intro) {
      const p = document.createElement('p');
      p.textContent = entry.intro;
      body.appendChild(p);
    }
    if (entry.bullets?.length) {
      const ul = document.createElement('ul');
      ul.className = 'context-help-list';
      for (const item of entry.bullets) {
        const li = document.createElement('li');
        li.textContent = item;
        ul.appendChild(li);
      }
      body.appendChild(ul);
    }
    if (entry.note) {
      const note = document.createElement('div');
      note.className = 'context-help-note';
      note.textContent = entry.note;
      body.appendChild(note);
    }
  }

  function open(key) {
    const resolved = key === 'current-page' ? currentPageKey() : key;
    render(HELP[resolved] || HELP.geral);
    if (!dialog.open) dialog.showModal();
  }

  document.addEventListener('click', event => {
    const btn = event.target.closest('[data-help-key]');
    if (btn) {
      event.preventDefault();
      open(btn.dataset.helpKey || 'geral');
    }
  });

  close?.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if (event.target === dialog) dialog.close();
  });
})();
