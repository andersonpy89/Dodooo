/*****************************************************
 * DODÔ — CONTROLE FINANCEIRO PESSOAL
 * JS puro | Offline | Arquitetura estável
 *****************************************************/

const STORAGE_KEY = "dodo-app-data"

/* ===================================================
   STORAGE (BLINDADO)
=================================================== */

function loadAppData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch (err) {
    console.warn("Storage corrompido. Resetando…")
    localStorage.removeItem(STORAGE_KEY)
    return null
  }
}

function saveAppData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/* ===================================================
   MODELS
=================================================== */

const uid = () => Math.random().toString(36).substring(2, 10)

const createControle = nome => ({ id: uid(), nome })
const createPessoa = nome => ({ id: uid(), nome })
const createCategoria = nome => ({ id: uid(), nome })
const createDespesa = nome => ({ id: uid(), nome })

const createTransacao = data => ({
  id: uid(),
  pessoaId: data.pessoaId,
  tipo: data.tipo,
  despesaId: data.despesaId,
  categoriaId: data.categoriaId,
  valor: Number(data.valor),
  data: data.data
})

function createInitialAppData(nome) {
  return {
    controle: createControle(nome),
    pessoas: [],
    categorias: [],
    despesas: [],
    transacoes: []
  }
}

/* ===================================================
   UTIL
=================================================== */

const qs = sel => document.querySelector(sel)
const hojeISO = () => new Date().toISOString().slice(0, 10)

/* ===================================================
   STATE
=================================================== */

let appData = loadAppData()
let filtroPeriodo = "mensal"
let transacaoEditando = null
const app = qs("#app")

/* ===================================================
   BOOT
=================================================== */

if (!appData) renderSetup()
else renderApp()

/* ===================================================
   SETUP
=================================================== */

function renderSetup() {
  app.innerHTML = `
    <div class="container">
      <h1>Bem-vindo ao Dodô 🦤</h1>
      <form id="setup-form">
        <input id="controle-nome" placeholder="Nome do controle" required />
        <button>Criar</button>
      </form>
    </div>
  `

  qs("#setup-form").onsubmit = e => {
    e.preventDefault()
    const nome = qs("#controle-nome").value.trim()
    if (!nome) return

    appData = createInitialAppData(nome)
    saveAppData(appData)
    renderApp()
  }
}

/* ===================================================
   RENDER CORE
=================================================== */

function renderApp() {
  renderHTML()
  bindEventos()
  afterRender()
}

function renderHTML() {
  app.innerHTML = `
    <div class="container">
      <h2 class="titulo-controle">Dodô — ${appData.controle.nome}</h2>

      ${accordion("Resumo Financeiro", renderResumo(), true)}
      ${accordion("Dashboard", renderDashboard())}
      ${accordion("Cadastros", renderCadastros())}
      ${accordion("Nova Transação", renderNovaTransacao())}
      ${accordion("Transações", renderListaTransacoes(), true)}
    </div>
  `
}

function afterRender() {
  desenharGraficos()
}

/* ===================================================
   ACCORDION
=================================================== */

function accordion(titulo, conteudo, aberto = false) {
  return `
    <section class="accordion ${aberto ? "open" : ""}">
      <header onclick="this.parentElement.classList.toggle('open')">
        ${titulo}
      </header>
      <div class="content">${conteudo}</div>
    </section>
  `
}

/* ===================================================
   RESUMO
=================================================== */

function calcularResumo() {
  return appData.transacoes.reduce(
    (acc, t) => {
      t.tipo === "entrada"
        ? (acc.entradas += t.valor)
        : (acc.saidas += t.valor)
      acc.total = acc.entradas - acc.saidas
      return acc
    },
    { entradas: 0, saidas: 0, total: 0 }
  )
}

function renderResumo() {
  const r = calcularResumo()
  const classeTotal = r.total >= 0 ? "positivo" : "negativo"

  return `
    <div class="resumo">
      <div class="resumo-card entrada">
        <strong>Entradas</strong>
        <p>R$ ${r.entradas.toFixed(2)}</p>
      </div>

      <div class="resumo-card saida">
        <strong>Saídas</strong>
        <p>R$ ${r.saidas.toFixed(2)}</p>
      </div>

      <div class="resumo-card total ${classeTotal}">
        <strong>Total</strong>
        <p>R$ ${r.total.toFixed(2)}</p>
      </div>
    </div>
  `
}

/* ===================================================
   DASHBOARD
=================================================== */

function renderDashboard() {
  return `
    <label>
      Período:
      <select id="filtro-periodo">
        <option value="mensal" ${filtroPeriodo === "mensal" ? "selected" : ""}>Mensal</option>
        <option value="anual" ${filtroPeriodo === "anual" ? "selected" : ""}>Anual</option>
      </select>
    </label>

    <div class="dash">
      <canvas id="grafico-barras" width="400" height="250"></canvas>
      <canvas id="grafico-pizza" width="250" height="250"></canvas>
    </div>
  `
}

/* ===================================================
   CADASTROS
=================================================== */

function renderCadastros() {
  return `
    <div class="cadastros">

      <div>
        <h4>Pessoas</h4>
        <form id="pessoa-form">
          <input id="pessoa-nome" placeholder="Nome" required />
          <button>Adicionar</button>
        </form>
      </div>

      <div>
        <h4>Categorias</h4>
        <form id="categoria-form">
          <input id="categoria-nome" placeholder="Categoria" required />
          <button>Adicionar</button>
        </form>
      </div>

    </div>
  `
}

/* ===================================================
   NOVA TRANSAÇÃO
=================================================== */

function renderNovaTransacao() {
  const t = transacaoEditando

  return `
    <form id="transacao-form">

      <select id="t-pessoa" required>
        ${appData.pessoas.map(p =>
          `<option value="${p.id}" ${t?.pessoaId === p.id ? "selected" : ""}>${p.nome}</option>`
        ).join("")}
      </select>

      <select id="t-tipo">
        <option value="entrada" ${t?.tipo === "entrada" ? "selected" : ""}>Entrada</option>
        <option value="saida" ${t?.tipo === "saida" ? "selected" : ""}>Saída</option>
      </select>

      <input id="t-despesa" placeholder="Despesa" required value="${
        t ? appData.despesas.find(d => d.id === t.despesaId)?.nome ?? "" : ""
      }"/>

      <select id="t-categoria">
        ${appData.categorias.map(c =>
          `<option value="${c.id}" ${t?.categoriaId === c.id ? "selected" : ""}>${c.nome}</option>`
        ).join("")}
      </select>

      <input id="t-valor" type="number" step="0.01" required value="${t?.valor ?? ""}" />
      <input id="t-data" type="date" value="${t?.data ?? hojeISO()}" />

      <button>${t ? "Atualizar" : "Salvar"}</button>
    </form>
  `
}

/* ===================================================
   LISTA
=================================================== */

function renderListaTransacoes() {
  if (appData.transacoes.length === 0) {
    return `<p>Nenhuma transação cadastrada.</p>`
  }

  return `
    <table>
      <thead>
        <tr>
          <th class="data">Data</th>
          <th>Despesa</th>
          <th class="valor">Valor</th>
          <th class="acoes">Ações</th>
        </tr>
      </thead>
      <tbody>
        ${appData.transacoes.map(renderLinha).join("")}
      </tbody>
    </table>
  `
}

function renderLinha(t) {
  const despesa = appData.despesas.find(d => d.id === t.despesaId)
  const cor = t.tipo === "saida" ? "red" : "green"
  const sinal = t.tipo === "saida" ? "-" : "+"

  return `
    <tr>
      <td class="data">${t.data}</td>
      <td>${despesa?.nome || "-"}</td>
      <td class="valor" style="color:${cor}">
        ${sinal} R$ ${t.valor.toFixed(2)}
      </td>
      <td class="acoes">
        <button class="btn-editar" data-id="${t.id}">✏️</button>
        <button class="btn-excluir" data-id="${t.id}">❌</button>
      </td>
    </tr>
  `
}

/* ===================================================
   EVENTOS
=================================================== */

function bindEventos() {
  bindFiltro()
  bindCadastros()
  bindTransacao()
  bindLista()
}

function bindFiltro() {
  const f = qs("#filtro-periodo")
  if (f) {
    f.onchange = e => {
      filtroPeriodo = e.target.value
      renderApp()
    }
  }
}

function bindCadastros() {
  const pf = qs("#pessoa-form")
  if (pf) {
    pf.onsubmit = e => {
      e.preventDefault()
      appData.pessoas.push(createPessoa(qs("#pessoa-nome").value.trim()))
      saveAppData(appData)
      renderApp()
    }
  }

  const cf = qs("#categoria-form")
  if (cf) {
    cf.onsubmit = e => {
      e.preventDefault()
      appData.categorias.push(createCategoria(qs("#categoria-nome").value.trim()))
      saveAppData(appData)
      renderApp()
    }
  }
}

function bindTransacao() {
  const f = qs("#transacao-form")
  if (!f) return

  f.onsubmit = e => {
    e.preventDefault()

    let despesa = appData.despesas.find(
      d => d.nome.toLowerCase() === qs("#t-despesa").value.toLowerCase()
    )

    if (!despesa) {
      despesa = createDespesa(qs("#t-despesa").value.trim())
      appData.despesas.push(despesa)
    }

    const dados = {
      pessoaId: qs("#t-pessoa").value,
      tipo: qs("#t-tipo").value,
      despesaId: despesa.id,
      categoriaId: qs("#t-categoria").value,
      valor: qs("#t-valor").value,
      data: qs("#t-data").value
    }

    if (transacaoEditando) {
      Object.assign(transacaoEditando, dados)
      transacaoEditando = null
    } else {
      appData.transacoes.push(createTransacao(dados))
    }

    saveAppData(appData)
    renderApp()
  }
}

function bindLista() {
  document.querySelectorAll(".btn-excluir").forEach(b => {
    b.onclick = () => {
      appData.transacoes = appData.transacoes.filter(
        t => t.id !== b.dataset.id
      )
      saveAppData(appData)
      renderApp()
    }
  })

  document.querySelectorAll(".btn-editar").forEach(b => {
    b.onclick = () => {
      transacaoEditando = appData.transacoes.find(t => t.id === b.dataset.id)
      renderApp()
    }
  })
}

/* ===================================================
   GRÁFICOS (placeholder)
=================================================== */

function desenharGraficos() {
  // Implementação futura
}