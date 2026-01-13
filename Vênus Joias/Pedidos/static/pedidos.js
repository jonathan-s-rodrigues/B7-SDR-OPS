document.addEventListener('DOMContentLoaded', () => {

    // --- Mapeamento para o Excel ---
    const mapeamento_excel = {
        'ID do Pedido': 'ID_Pedido',
        'Data da Compra': 'Data_Compra',
        'Itens (Descrição)': 'Item',
        'Valor Unitário': 'Valor_Unitario',
        'Quantidade': 'Quantidade',
    };

    // -------------------------------------------------------------------
    // A) Funcionalidade de EDIÇÃO PERMANENTE (UPDATE)
    // -------------------------------------------------------------------
    document.querySelectorAll('td[contenteditable="true"]').forEach(cell => {
        cell.addEventListener('blur', function() {
            const row = this.closest('tr');
            const itemId = row.getAttribute('data-item-id');
            const colunaLabel = this.getAttribute('data-label');
            const valor = this.textContent.trim();
            const coluna_excel = mapeamento_excel[colunaLabel];

            if (!coluna_excel || !itemId) {
                console.error("Não foi possível mapear a coluna ou obter o Item ID.");
                return;
            }
            
            // Envio AJAX para a rota /salvar_edicao
            fetch('/salvar_edicao', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ item_id: itemId, coluna: coluna_excel, valor: valor })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'sucesso') {
                    console.log('Salvo com sucesso:', data.mensagem);
                    // Feedback visual e recarga para recalcular totais
                    this.style.backgroundColor = '#d4edda'; 
                    setTimeout(() => { window.location.reload(); }, 500); 
                } else {
                    alert('Erro ao salvar: ' + data.mensagem);
                    this.style.backgroundColor = '#f8d7da'; 
                }
            })
            .catch(error => {
                console.error('Erro de conexão:', error);
                alert('Erro de rede ou servidor ao salvar.');
                this.style.backgroundColor = '#f8d7da';
            });
        });
    });

    // -------------------------------------------------------------------
    // B) Funcionalidade ADICIONAR NOVO ITEM (CREATE)
    // -------------------------------------------------------------------
    const btnAdicionar = document.getElementById('btnAdicionar');
    const btnSalvarNovo = document.getElementById('btnSalvarNovo');
    const btnCancelarNovo = document.getElementById('btnCancelarNovo');
    const formularioAdicionar = document.getElementById('formularioAdicionar');

    // Toggle do formulário
    btnAdicionar.addEventListener('click', () => {
        formularioAdicionar.style.display = 'block';
        btnAdicionar.style.display = 'none';
    });
    btnCancelarNovo.addEventListener('click', () => {
        formularioAdicionar.style.display = 'none';
        btnAdicionar.style.display = 'block';
    });

    // Salvar o novo item
    btnSalvarNovo.addEventListener('click', () => {
        const novoPedido = {
            ID_Pedido: document.getElementById('novoID').value,
            Data_Compra: document.getElementById('novaData').value,
            Item: document.getElementById('novoItem').value,
            Valor_Unitario: document.getElementById('novoValor').value,
            Quantidade: document.getElementById('novaQuantidade').value
        };

        if (!novoPedido.ID_Pedido || !novoPedido.Data_Compra || !novoPedido.Item || !novoPedido.Valor_Unitario || !novoPedido.Quantidade) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Envio AJAX para a rota /adicionar_pedido
        fetch('/adicionar_pedido', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(novoPedido)
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === 'sucesso') {
                alert('Item adicionado com sucesso! A página será recarregada.');
                window.location.reload(); 
            } else {
                alert('Erro ao adicionar item: ' + data.mensagem);
            }
        })
        .catch(error => {
            alert('Erro de rede ou servidor ao adicionar item.');
        });
    });
    
    // -------------------------------------------------------------------
    // C) Funcionalidade REMOVER ITEM (DELETE)
    // -------------------------------------------------------------------
    document.querySelectorAll('.btn-remove').forEach(button => {
        button.addEventListener('click', function() {
            const itemId = this.closest('tr').getAttribute('data-item-id');
            if (confirm(`Tem certeza que deseja remover o Item ID ${itemId}?`)) {
                
                fetch('/remover_item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ item_id: itemId })
                })
                .then(response => response.json())
                .then(data => {
                    if (data.status === 'sucesso') {
                        alert('Item removido! A página será recarregada.');
                        this.closest('tr').remove();
                        window.location.reload(); 
                    } else {
                        alert('Erro ao remover: ' + data.mensagem);
                    }
                })
                .catch(error => {
                    alert('Erro de rede ou servidor ao remover.');
                });
            }
        });
    });
});