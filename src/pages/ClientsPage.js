import { useCallback, useState } from 'react';
import ActionMenu from '../components/ActionMenu';
import AsyncView from '../components/AsyncView';
import ClientForm from '../components/ClientForm';
import ConfirmDialog from '../components/ConfirmDialog';
import Icon from '../components/Icon';
import Modal from '../components/Modal';
import useAsync from '../hooks/useAsync';
import { initials } from '../lib';
import { getMyClients, registerClient, removeClient, updateClient } from '../services/clients';

// Cartera = clientes con los que el asesor tiene negociaciones más los que registró él mismo.
export default function ClientsPage({ user }) {
  const [version, setVersion] = useState(0); // sube tras guardar para volver a cargar la lista
  const state = useAsync(() => getMyClients(user.id), [user.id, version]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null);
  const [removing, setRemoving] = useState(null);
  const [notice, setNotice] = useState('');
  const closeCreate = useCallback(() => setCreating(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeRemove = useCallback(() => setRemoving(null), []);

  function done(message) {
    setCreating(false);
    setEditing(null);
    setRemoving(null);
    setNotice(message);
    setVersion((v) => v + 1);
  }

  async function handleCreate(values) {
    const { cliente, yaExistia } = await registerClient(values);
    done(yaExistia
      ? `${cliente.nombre} ya estaba registrado con ese correo y se agregó a tu cartera.`
      : `${cliente.nombre} se registró y se agregó a tu cartera.`);
  }

  async function handleEdit(values) {
    await updateClient(editing, values);
    done(`Se guardaron los datos de ${values.nombre.trim()}.`);
  }

  async function handleRemove() {
    await removeClient(user.id, removing);
    done(`${removing.nombre} se quitó de tu cartera.`);
  }

  // "Quitar" solo aplica a quien el asesor registró: un cliente con negociaciones sigue en la cartera por ellas.
  const menuItems = (c) => [
    { label: 'Editar datos', icon: 'edit', onSelect: () => { setNotice(''); setEditing(c); } },
    ...(c.enCartera
      ? [{ label: 'Quitar de mi cartera', icon: 'trash', danger: true, onSelect: () => { setNotice(''); setRemoving(c); } }]
      : []),
  ];

  return (
    <>
      <AsyncView state={state}>
        {(clients) => (
          <>
            <div className="o-page-head">
              <div>
                <p className="o-eyebrow">Relaciones</p>
                <h1 className="o-title">Cartera de clientes<span className="o-count">{clients.length}</span></h1>
              </div>
              <button type="button" className="o-btn o-btn--lime" onClick={() => { setNotice(''); setCreating(true); }}>
                <Icon name="plus" size={16} strokeWidth={2.5} /> Registrar cliente
              </button>
            </div>
            {notice && <p className="o-notice" role="status">{notice}</p>}

            <section className="o-card o-card--flush">
              {clients.length ? (
                <div className="o-table-wrap">
                  <table className="o-table">
                    <thead>
                      <tr>
                        <th>Cliente</th>
                        <th>Correo</th>
                        <th>Teléfono</th>
                        <th className="is-actions"><span className="u-sr-only">Modificar</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {clients.map((c) => (
                        <tr key={c.id}>
                          <td>
                            <div className="o-thumb">
                              <span className="o-avatar" aria-hidden="true">{initials(c.nombre)}</span>
                              <p className="o-thumb__title">{c.nombre}</p>
                            </div>
                          </td>
                          <td>
                            <a className="c-contact" href={`mailto:${c.correo}`}><Icon name="mail" size={14} /> {c.correo}</a>
                          </td>
                          <td>
                            {c.telefono
                              ? <a className="c-contact" href={`tel:${c.telefono.replace(/\s/g, '')}`}><Icon name="phone" size={14} /> {c.telefono}</a>
                              : <span className="o-muted">—</span>}
                          </td>
                          <td className="is-actions">
                            <ActionMenu label={c.nombre} items={menuItems(c)} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="o-empty">Aún no tienes clientes. Registra el primero con el botón de arriba.</p>}
            </section>
          </>
        )}
      </AsyncView>

      {creating && (
        <Modal title="Registrar cliente" subtitle="Agrégalo a tu cartera" icon="users" onClose={closeCreate}>
          <ClientForm onSubmit={handleCreate} onCancel={closeCreate} />
        </Modal>
      )}
      {editing && (
        <Modal title="Editar cliente" subtitle={editing.nombre} icon="edit" onClose={closeEdit}>
          <ClientForm initial={editing} submitLabel="Guardar cambios" onSubmit={handleEdit} onCancel={closeEdit} />
        </Modal>
      )}
      {removing && (
        <Modal title="Quitar de mi cartera" subtitle="Revisa antes de confirmar" icon="users" size="sm" onClose={closeRemove}>
          <ConfirmDialog
            summary={(
              <div className="o-thumb">
                <span className="o-avatar" aria-hidden="true">{initials(removing.nombre)}</span>
                <div>
                  <p className="o-thumb__title">{removing.nombre}</p>
                  <p className="o-thumb__meta">{removing.correo}</p>
                </div>
              </div>
            )}
            message={removing.negociaciones
              ? 'Tiene negociaciones contigo, así que seguirá apareciendo en tu cartera por ellas.'
              : 'Dejará de aparecer en tu cartera. Su cuenta no se borra y puedes volver a agregarlo con su correo.'}
            confirmLabel="Quitar de mi cartera"
            busyLabel="Quitando…"
            onConfirm={handleRemove}
            onCancel={closeRemove}
          />
        </Modal>
      )}
    </>
  );
}
