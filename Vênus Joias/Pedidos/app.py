import pandas as pd
from flask import Flask, render_template, request, jsonify
import numpy as np

app = Flask(__name__, static_url_path='/static')
EXCEL_FILE = "pedidos.xlsx"

# --- Funções de Leitura e Escrita ---

def salvar_excel(df):
    """Salva o DataFrame de volta no arquivo Excel."""
    try:
        df.to_excel(EXCEL_FILE, index=False)
        return True
    except Exception as e:
        print(f"Erro ao salvar Excel: {e}")
        return False

def carregar_dados_pedidos(arquivo_excel=EXCEL_FILE):
    """Lê, processa e calcula os totais dos pedidos."""
    try:
        df = pd.read_excel(arquivo_excel)
        
        # 1. GARANTIR Item_ID ÚNICO e tipos
        if 'Item_ID' not in df.columns or df['Item_ID'].isnull().any():
             # Cria um Item_ID sequencial se não existir ou estiver incompleto
            df['Item_ID'] = np.arange(len(df)) + 1
        
        # Converte e calcula
        df['Valor_Unitario'] = pd.to_numeric(df['Valor_Unitario'], errors='coerce').fillna(0)
        df['Quantidade'] = pd.to_numeric(df['Quantidade'], errors='coerce').fillna(0)
        df['Valor_Total_Item'] = df['Valor_Unitario'] * df['Quantidade']
        
        # 2. Calcular o Valor Total do Pedido
        total_por_pedido = df.groupby('ID_Pedido')['Valor_Total_Item'].sum().reset_index()
        total_por_pedido.rename(columns={'Valor_Total_Item': 'Valor_Total_Pedido'}, inplace=True)
        df = df.merge(total_por_pedido, on='ID_Pedido', how='left')
        
        # 3. Formatar e identificar linhas
        df = df.sort_values(by=['ID_Pedido', 'Item_ID'], ascending=[False, False])
        df['Data_Compra'] = pd.to_datetime(df['Data_Compra'], errors='coerce').dt.strftime('%d/%m/%Y')
        df['Primeira_Linha'] = df.duplicated(subset=['ID_Pedido'], keep='first') == False
        
        # Formata valores para exibição
        df['Valor_Unitario_Fmt'] = df['Valor_Unitario'].apply(lambda x: f"R$ {x:.2f}".replace('.', ','))
        df['Valor_Total_Item_Fmt'] = df['Valor_Total_Item'].apply(lambda x: f"R$ {x:.2f}".replace('.', ','))
        df['Valor_Total_Pedido_Fmt'] = df['Valor_Total_Pedido'].apply(lambda x: f"R$ {x:.2f}".replace('.', ','))
        
        return df.to_dict('records')

    except FileNotFoundError:
        print(f"Arquivo {arquivo_excel} não encontrado.")
        return []
    except Exception as e:
        print(f"Erro ao processar o Excel: {e}")
        return []

# --- Rotas (CRUD) ---

@app.route('/')
def lista_pedidos():
    """Rota para exibir a tabela de pedidos."""
    dados = carregar_dados_pedidos()
    return render_template('pedidos_dinamico.html', pedidos=dados)

# 1. EDITAR/SALVAR (UPDATE)
@app.route('/salvar_edicao', methods=['POST'])
def salvar_edicao():
    """Salva a edição de uma célula específica no Excel usando Item_ID."""
    try:
        data = request.json
        item_id = int(data['item_id'])
        coluna = data['coluna']
        novo_valor = data['valor']
        
        df = pd.read_excel(EXCEL_FILE)
        
        # Normalização do valor e ID
        if coluna in ['Valor_Unitario', 'Quantidade']:
            novo_valor = float(novo_valor.replace('R$', '').replace('.', '').replace(',', '.').strip())
        elif coluna == 'ID_Pedido':
            novo_valor = int(novo_valor.replace('#', '').strip())

        index_to_update = df[df['Item_ID'] == item_id].index[0]
        df.loc[index_to_update, coluna] = novo_valor
        
        if salvar_excel(df):
            return jsonify({'status': 'sucesso', 'mensagem': f'Item ID {item_id} atualizado.'})
        else:
            return jsonify({'status': 'erro', 'mensagem': 'Erro ao salvar o arquivo Excel.'}), 500

    except Exception as e:
        return jsonify({'status': 'erro', 'mensagem': str(e)}), 500

# 2. REMOVER (DELETE)
@app.route('/remover_item', methods=['POST'])
def remover_item():
    """Remove uma linha completa do Excel usando Item_ID."""
    try:
        item_id = int(request.json['item_id'])
        
        df = pd.read_excel(EXCEL_FILE)
        df_atualizado = df[df['Item_ID'] != item_id]
        
        if salvar_excel(df_atualizado):
            return jsonify({'status': 'sucesso', 'mensagem': f'Item ID {item_id} removido.'})
        else:
            return jsonify({'status': 'erro', 'mensagem': 'Erro ao salvar o arquivo Excel.'}), 500

    except Exception as e:
        return jsonify({'status': 'erro', 'mensagem': str(e)}), 500

# 3. ADICIONAR (CREATE)
@app.route('/adicionar_pedido', methods=['POST'])
def adicionar_pedido():
    """Adiciona um novo item/linha ao Excel com base nos dados do formulário."""
    try:
        novo_item = request.json
        df = pd.read_excel(EXCEL_FILE)
        
        # Determina o próximo Item_ID único
        next_item_id = df['Item_ID'].max() + 1 if 'Item_ID' in df.columns and not df.empty else 1
        
        novo_df_item = pd.DataFrame([{
            'Item_ID': next_item_id,
            'ID_Pedido': int(novo_item['ID_Pedido']),
            'Data_Compra': pd.to_datetime(novo_item['Data_Compra'], format='%d/%m/%Y', errors='coerce'),
            'Item': novo_item['Item'],
            'Valor_Unitario': float(novo_item['Valor_Unitario']),
            'Quantidade': int(novo_item['Quantidade'])
        }])
        
        df = pd.concat([df, novo_df_item], ignore_index=True)
        
        if salvar_excel(df):
            return jsonify({'status': 'sucesso', 'mensagem': 'Item adicionado com sucesso.'})
        else:
            return jsonify({'status': 'erro', 'mensagem': 'Erro ao salvar o arquivo Excel.'}), 500

    except Exception as e:
        return jsonify({'status': 'erro', 'mensagem': f'Erro ao processar adição: {str(e)}'}), 500

if __name__ == '__main__':
    # Execute com 'python app.py' e acesse http://127.0.0.1:5000/
    app.run(debug=True)