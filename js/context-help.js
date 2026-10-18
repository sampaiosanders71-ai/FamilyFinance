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
      intro: 'Abra um cartão para consultar limite, fatura atual, gráfico de faturas e compras. Toque em uma barra para abrir a fatura daquele mês ou use Histórico de faturas para navegar entre competências anteriores e futuras.',
      bullets: ['Compras entram na fatura conforme a competência do cartão e já contam nos limites e análises de consumo.', 'Enquanto a fatura estiver aberta, ela não é tratada como despesa paga no Dashboard.', 'Registre o pagamento integral ou parcial com a data efetiva. Ele atualiza o caixa, o saldo devido e o limite, sem duplicar o consumo.', 'Compras com histórico protegido permitem corrigir descrição e categoria. Valores exigem ajuste ou estorno separado, com aplicação confirmada pelo emissor.']
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
      bullets: ['Compare meses ou anos.', 'Veja evolução, categorias, planejamento, limites e cartões.', 'Cores, nomes e ícones das categorias seguem o gerenciador de Categorias.', 'Ao comparar um mês ou ano em andamento, os dois períodos usam o mesmo dia de corte.', 'Aumentos de despesas aparecem em vermelho; reduções, em verde. Sem base anterior significa que o período comparado tinha valor zero.', 'A evolução mensal permite escolher 3, 6 ou 12 meses. Gráficos mais largos podem ser percorridos horizontalmente.', 'Em Limites, laranja representa o limite e azul representa o gasto real. As explicações detalhadas podem ser expandidas na própria tela.']
    },
    familia: {
      title: 'Sobre Família',
      intro: 'Acompanhe somente os grupos de dados que cada pessoa autorizou compartilhar.',
      bullets: ['Quem acompanha meus dados mostra quem tem acesso ao seu financeiro. Pessoas que acompanho mostra os titulares que compartilharam dados com você.', 'Convites ficam reunidos em Recebidos e Enviados.', 'Visualizar abre uma tela de consulta com abas conforme as permissões. Voltar mantém o contexto da lista.', 'O titular controla os grupos liberados. Remover ou deixar de acompanhar encerra o vínculo.', 'As listas extensas mostram páginas no computador e Carregar mais no celular. Totais e gráficos continuam completos.', 'Metas compartilhadas mostram o saldo atual autorizado, independentemente do mês escolhido para lançamentos, cartões e limites.']
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
    'planning-summary': {
      title: 'Resumo do planejamento',
      intro: 'Os indicadores usam os planos ativos do mês selecionado.',
      bullets: ['Receitas incluem os recebimentos previstos e já concluídos.', 'Despesas incluem consumo; reservas e transferências ficam separadas.', 'Saldo planejado é receitas menos despesas planejadas, não o saldo da conta.', 'Conclusão compara itens pagos ou recebidos com os concluídos, pendentes e adiados. Cancelados ficam fora dessa proporção.']
    },
    'planning-reserves': {
      title: 'Reservas do mês',
      intro: 'Reservado mostra lançamentos de reserva já realizados na competência. Reservas futuras mostra lançamentos futuros já cadastrados nessa competência.',
      note: 'Reservas somente planejadas continuam em Meus planos e não viram movimento de caixa antes da realização.'
    },
    'planning-cash-projection': {
      title: 'Projeção do saldo livre',
      intro: 'No mês atual, usa o saldo atual e os lançamentos futuros registrados, incluindo reservas.',
      bullets: ['Meus planos não são somados novamente, evitando duplicação.', 'Em outras competências aparece um traço, para não sugerir um saldo histórico incorreto.']
    },
    'planning-overview-limits': {
      title: 'Limites por categoria',
      intro: 'Na visão geral, o valor e a barra mostram o gasto realizado em relação ao limite do mês selecionado.',
      bullets: ['Selecione uma categoria para ver também o planejamento pendente e o disponível na aba Limites.', 'Planos pendentes continuam comprometendo o disponível, conforme as regras atuais.', 'As categorias com maior proporção realizada ou comprometida aparecem primeiro.']
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
