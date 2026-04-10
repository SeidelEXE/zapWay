export default function Table({ columns, data, onEdit, onDelete }) {
  const formatValue = (value, key) => {
    if (key === 'enabled') {
      return value ? 'Ativo' : 'Inativo';
    }
    if (key === 'timestamp') {
      return new Date(value).toLocaleString();
    }
    return value || '-';
  };

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
            {(onEdit || onDelete) && <th>Ações</th>}
          </tr>
        </thead>
        <tbody>
          {data.map((item, index) => (
            <tr key={item.id || index}>
              {columns.map((col) => (
                <td key={col.key}>{formatValue(item[col.key], col.key)}</td>
              ))}
              {(onEdit || onDelete) && (
                <td className="actions-cell">
                  {onEdit && (
                    <button
                      onClick={() => onEdit(item)}
                      className="btn-edit"
                    >
                      Editar
                    </button>
                  )}
                  {onDelete && (
                    <button
                      onClick={() => onDelete(item.id)}
                      className="btn-danger"
                    >
                      Excluir
                    </button>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
