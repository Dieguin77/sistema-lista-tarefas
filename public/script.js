// API Base URL
const API_URL = '/api/tarefas';

// Elementos do DOM
const corpoTabela = document.getElementById('corpoTabela');
const totalCusto = document.getElementById('totalCusto');
const modalTarefa = document.getElementById('modalTarefa');
const modalConfirmacao = document.getElementById('modalConfirmacao');
const formTarefa = document.getElementById('formTarefa');
const modalTitulo = document.getElementById('modalTitulo');
const btnNovaTarefa = document.getElementById('btnNovaTarefa');
const tabelaTarefas = document.getElementById('tabelaTarefas');
const mensagemVazia = document.getElementById('mensagemVazia');

let tarefaParaExcluir = null;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
  carregarTarefas();
  configurarEventos();
});

// Configurar eventos
function configurarEventos() {
  btnNovaTarefa.addEventListener('click', abrirModalNovaTarefa);
  formTarefa.addEventListener('submit', salvarTarefa);
  document.getElementById('btnConfirmarExclusao').addEventListener('click', confirmarExclusao);
  
  // Máscara para o campo de custo
  document.getElementById('custo').addEventListener('input', formatarCampoMoeda);
  
  // Máscara para o campo de data
  document.getElementById('dataLimite').addEventListener('input', formatarCampoData);
  
  // Fechar modal ao clicar fora
  modalTarefa.addEventListener('click', (e) => {
    if (e.target === modalTarefa) fecharModal();
  });
  modalConfirmacao.addEventListener('click', (e) => {
    if (e.target === modalConfirmacao) fecharModalConfirmacao();
  });
}

// Carregar todas as tarefas
async function carregarTarefas() {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || 'Erro no servidor');
    }
    const tarefas = await response.json();
    renderizarTarefas(tarefas);
  } catch (error) {
    console.error('Erro ao carregar tarefas:', error);
    mostrarToast('Erro ao carregar tarefas. Verifique se o servidor está rodando.', 'error');
  }
}

// Renderizar tarefas na tabela
function renderizarTarefas(tarefas) {
  corpoTabela.innerHTML = '';
  
  if (tarefas.length === 0) {
    tabelaTarefas.style.display = 'none';
    mensagemVazia.style.display = 'block';
    return;
  }
  
  tabelaTarefas.style.display = 'table';
  mensagemVazia.style.display = 'none';
  
  let somaCustos = 0;
  
  tarefas.forEach((tarefa, index) => {
    const custo = parseFloat(tarefa.custo);
    somaCustos += custo;
    
    const tr = document.createElement('tr');
    tr.dataset.id = tarefa.id;
    tr.draggable = true;
    
    // Adicionar classe para custo alto (>= R$ 1.000,00)
    if (custo >= 1000) {
      tr.classList.add('custo-alto');
    }
    
    const isFirst = index === 0;
    const isLast = index === tarefas.length - 1;
    
    tr.innerHTML = `
      <td>${tarefa.id}</td>
      <td>${escapeHtml(tarefa.nome)}</td>
      <td>${formatarMoeda(custo)}</td>
      <td>${formatarData(tarefa.data_limite)}</td>
      <td class="acoes">
        <button class="btn-editar" onclick="abrirModalEditar(${tarefa.id})">Editar</button>
        <button class="btn-excluir" onclick="abrirModalExcluir(${tarefa.id}, '${escapeHtml(tarefa.nome)}')">Excluir</button>
      </td>
      <td class="ordem-btns">
        <button class="btn-ordem" onclick="moverTarefa(${tarefa.id}, 'subir')" ${isFirst ? 'disabled' : ''} title="Subir">▲</button>
        <button class="btn-ordem" onclick="moverTarefa(${tarefa.id}, 'descer')" ${isLast ? 'disabled' : ''} title="Descer">▼</button>
      </td>
    `;
    
    // Eventos de drag and drop
    tr.addEventListener('dragstart', handleDragStart);
    tr.addEventListener('dragend', handleDragEnd);
    tr.addEventListener('dragover', handleDragOver);
    tr.addEventListener('dragleave', handleDragLeave);
    tr.addEventListener('drop', handleDrop);
    
    corpoTabela.appendChild(tr);
  });
  
  // Atualizar total
  totalCusto.innerHTML = `<strong>${formatarMoeda(somaCustos)}</strong>`;
}

// Formatar valor para moeda brasileira
function formatarMoeda(valor) {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Formatar data para DD/MM/AAAA
function formatarData(dataISO) {
  if (!dataISO) return '';
  const data = new Date(dataISO + 'T00:00:00');
  const dia = String(data.getDate()).padStart(2, '0');
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const ano = data.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// Converter data de DD/MM/AAAA para YYYY-MM-DD
function converterDataParaISO(dataBR) {
  const partes = dataBR.split('/');
  if (partes.length !== 3) return null;
  const dia = partes[0];
  const mes = partes[1];
  const ano = partes[2];
  return `${ano}-${mes}-${dia}`;
}

// Validar data
function validarData(dataStr) {
  const partes = dataStr.split('/');
  if (partes.length !== 3) return false;
  
  const dia = parseInt(partes[0], 10);
  const mes = parseInt(partes[1], 10);
  const ano = parseInt(partes[2], 10);
  
  if (isNaN(dia) || isNaN(mes) || isNaN(ano)) return false;
  if (mes < 1 || mes > 12) return false;
  if (dia < 1 || dia > 31) return false;
  if (ano < 1900 || ano > 2100) return false;
  
  // Verificar se a data é válida
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && 
         data.getMonth() === mes - 1 && 
         data.getDate() === dia;
}

// Formatar campo de moeda enquanto digita
function formatarCampoMoeda(e) {
  let valor = e.target.value.replace(/\D/g, '');
  if (valor === '') {
    e.target.value = '';
    return;
  }
  valor = (parseInt(valor) / 100).toFixed(2);
  valor = valor.replace('.', ',');
  valor = valor.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  e.target.value = valor;
}

// Formatar campo de data enquanto digita
function formatarCampoData(e) {
  let valor = e.target.value.replace(/\D/g, '');
  if (valor.length > 8) valor = valor.substring(0, 8);
  
  if (valor.length >= 5) {
    valor = valor.substring(0, 2) + '/' + valor.substring(2, 4) + '/' + valor.substring(4);
  } else if (valor.length >= 3) {
    valor = valor.substring(0, 2) + '/' + valor.substring(2);
  }
  
  e.target.value = valor;
}

// Converter string de moeda para número
function converterMoedaParaNumero(valor) {
  if (!valor) return 0;
  return parseFloat(valor.replace(/\./g, '').replace(',', '.'));
}

// Escapar HTML para prevenir XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Abrir modal para nova tarefa
function abrirModalNovaTarefa() {
  modalTitulo.textContent = 'Nova Tarefa';
  formTarefa.reset();
  document.getElementById('tarefaId').value = '';
  modalTarefa.style.display = 'flex';
  document.getElementById('nome').focus();
}

// Abrir modal para editar tarefa
async function abrirModalEditar(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`);
    if (!response.ok) throw new Error('Tarefa não encontrada');
    
    const tarefa = await response.json();
    
    modalTitulo.textContent = 'Editar Tarefa';
    document.getElementById('tarefaId').value = tarefa.id;
    document.getElementById('nome').value = tarefa.nome;
    
    // Formatar custo para exibição
    const custoFormatado = parseFloat(tarefa.custo).toFixed(2).replace('.', ',');
    document.getElementById('custo').value = custoFormatado;
    
    document.getElementById('dataLimite').value = formatarData(tarefa.data_limite);
    
    modalTarefa.style.display = 'flex';
    document.getElementById('nome').focus();
  } catch (error) {
    console.error('Erro ao carregar tarefa:', error);
    mostrarToast('Erro ao carregar tarefa', 'error');
  }
}

// Fechar modal de tarefa
function fecharModal() {
  modalTarefa.style.display = 'none';
  formTarefa.reset();
}

// Abrir modal de confirmação de exclusão
function abrirModalExcluir(id, nome) {
  tarefaParaExcluir = id;
  document.getElementById('nomeExclusao').textContent = nome;
  modalConfirmacao.style.display = 'flex';
}

// Fechar modal de confirmação
function fecharModalConfirmacao() {
  modalConfirmacao.style.display = 'none';
  tarefaParaExcluir = null;
}

// Confirmar exclusão
async function confirmarExclusao() {
  if (!tarefaParaExcluir) return;
  
  try {
    const response = await fetch(`${API_URL}/${tarefaParaExcluir}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Erro ao excluir tarefa');
    }
    
    mostrarToast('Tarefa excluída com sucesso', 'success');
    fecharModalConfirmacao();
    carregarTarefas();
  } catch (error) {
    console.error('Erro ao excluir tarefa:', error);
    mostrarToast(error.message, 'error');
  }
}

// Salvar tarefa (criar ou atualizar)
async function salvarTarefa(e) {
  e.preventDefault();
  
  const id = document.getElementById('tarefaId').value;
  const nome = document.getElementById('nome').value.trim();
  const custoStr = document.getElementById('custo').value;
  const dataLimiteStr = document.getElementById('dataLimite').value;
  
  // Validações
  if (!nome) {
    mostrarToast('Nome da tarefa é obrigatório', 'error');
    return;
  }
  
  if (!custoStr) {
    mostrarToast('Custo é obrigatório', 'error');
    return;
  }
  
  const custo = converterMoedaParaNumero(custoStr);
  if (isNaN(custo) || custo < 0) {
    mostrarToast('Custo deve ser um valor válido maior ou igual a zero', 'error');
    return;
  }
  
  if (!dataLimiteStr) {
    mostrarToast('Data limite é obrigatória', 'error');
    return;
  }
  
  if (!validarData(dataLimiteStr)) {
    mostrarToast('Data limite inválida. Use o formato DD/MM/AAAA', 'error');
    return;
  }
  
  const dataLimite = converterDataParaISO(dataLimiteStr);
  
  const dados = {
    nome,
    custo,
    data_limite: dataLimite
  };
  
  try {
    let response;
    
    if (id) {
      // Atualizar
      response = await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
    } else {
      // Criar
      response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dados)
      });
    }
    
    if (!response.ok) {
      let errorMsg = 'Erro ao salvar tarefa';
      try {
        const data = await response.json();
        errorMsg = data.error || errorMsg;
      } catch (e) {
        const text = await response.text();
        if (text) errorMsg = text;
      }
      throw new Error(errorMsg);
    }
    
    const data = await response.json();
    mostrarToast(id ? 'Tarefa atualizada com sucesso' : 'Tarefa criada com sucesso', 'success');
    fecharModal();
    carregarTarefas();
  } catch (error) {
    console.error('Erro ao salvar tarefa:', error);
    mostrarToast(error.message || 'Erro ao conectar com o servidor', 'error');
  }
}

// Mover tarefa (subir/descer)
async function moverTarefa(id, direcao) {
  try {
    const response = await fetch(`${API_URL}/${id}/reordenar`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ direcao })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Erro ao reordenar tarefa');
    }
    
    carregarTarefas();
  } catch (error) {
    console.error('Erro ao reordenar tarefa:', error);
    mostrarToast(error.message, 'error');
  }
}

// Drag and Drop
let draggedRow = null;

function handleDragStart(e) {
  draggedRow = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  document.querySelectorAll('#corpoTabela tr').forEach(tr => {
    tr.classList.remove('drag-over');
  });
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  
  if (this !== draggedRow) {
    this.classList.add('drag-over');
  }
}

function handleDragLeave(e) {
  this.classList.remove('drag-over');
}

async function handleDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  
  if (this === draggedRow) return;
  
  // Obter todas as linhas
  const rows = Array.from(corpoTabela.querySelectorAll('tr'));
  const draggedIndex = rows.indexOf(draggedRow);
  const targetIndex = rows.indexOf(this);
  
  // Reordenar visualmente
  if (draggedIndex < targetIndex) {
    this.parentNode.insertBefore(draggedRow, this.nextSibling);
  } else {
    this.parentNode.insertBefore(draggedRow, this);
  }
  
  // Obter nova ordem
  const novasOrdens = Array.from(corpoTabela.querySelectorAll('tr')).map(tr => ({
    id: parseInt(tr.dataset.id)
  }));
  
  // Enviar para o servidor
  try {
    const response = await fetch(`${API_URL}/reordenar/drag`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ordens: novasOrdens })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Erro ao reordenar tarefas');
    }
    
    carregarTarefas();
  } catch (error) {
    console.error('Erro ao reordenar tarefas:', error);
    mostrarToast(error.message, 'error');
    carregarTarefas(); // Recarregar para restaurar ordem original
  }
}

// Mostrar notificação toast
function mostrarToast(mensagem, tipo = 'success') {
  // Remover toasts existentes
  document.querySelectorAll('.toast').forEach(t => t.remove());
  
  const toast = document.createElement('div');
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
