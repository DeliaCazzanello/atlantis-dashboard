import { useCallback, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';
import Modal from '../components/Modal';
import PropertyForm, { propertyToForm } from '../components/PropertyForm';
import { createProperty, setPropertyActive, updateProperty } from '../services/advisor';
import { registerClient } from '../services/clients';

// Registrar, editar, desactivar y reactivar inmuebles, con sus modales. Lo usan la lista y el detalle.
// onSaved: se llama tras cada cambio guardado (para volver a cargar los datos).
// Devuelve las acciones, el aviso o error de la última y `modals`, que la página dibuja.
export default function usePropertyActions(userId, onSaved) {
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState(null); // inmueble en edición
  const [deactivating, setDeactivating] = useState(null); // inmueble por desactivar
  const [notice, setNotice] = useState('');
  const [failure, setFailure] = useState(''); // error de una acción directa (reactivar)
  const closeCreate = useCallback(() => setCreating(false), []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const closeDeactivate = useCallback(() => setDeactivating(null), []);

  function done(message) {
    setCreating(false);
    setEditing(null);
    setDeactivating(null);
    setFailure('');
    setNotice(message);
    onSaved();
  }

  // Al empezar otra acción se borra el aviso de la anterior.
  const start = (open) => (arg) => {
    setNotice('');
    setFailure('');
    open(arg);
  };

  // El propietario se registra (o se toma el existente por su correo) y queda en la cartera del asesor.
  async function withOwner(payload) {
    const { cliente } = await registerClient(payload.propietario);
    return { ...payload, propietario: cliente };
  }

  async function handleCreate(payload) {
    await createProperty(userId, await withOwner(payload));
    done(`"${payload.titulo}" se registró correctamente.`);
  }

  async function handleEdit(payload) {
    await updateProperty(userId, editing, await withOwner(payload));
    done(`Se guardaron los cambios de "${payload.titulo}".`);
  }

  async function handleDeactivate() {
    await setPropertyActive(deactivating, false);
    done(`"${deactivating.titulo}" se desactivó y ya no aparece en el catálogo.`);
  }

  // Reactivar no necesita confirmación: no oculta nada y se puede volver a desactivar.
  async function reactivate(p) {
    setNotice('');
    setFailure('');
    try {
      await setPropertyActive(p, true);
      done(`"${p.titulo}" está activo de nuevo en el catálogo.`);
    } catch (err) {
      setFailure(err.userMessage ?? 'No se pudo reactivar el inmueble. Revisa tu conexión e intenta de nuevo.');
    }
  }

  const modals = (
    <>
      {creating && (
        <Modal title="Registrar inmueble" subtitle="Publícalo en el catálogo de Atlantis" icon="home" onClose={closeCreate}>
          <PropertyForm onSubmit={handleCreate} onCancel={closeCreate} />
        </Modal>
      )}
      {editing && (
        <Modal title="Editar inmueble" subtitle={editing.titulo} icon="edit" onClose={closeEdit}>
          <PropertyForm initial={propertyToForm(editing)} submitLabel="Guardar cambios" onSubmit={handleEdit} onCancel={closeEdit} />
        </Modal>
      )}
      {deactivating && (
        <Modal title="Desactivar inmueble" subtitle="Revisa antes de confirmar" icon="eyeOff" size="sm" onClose={closeDeactivate}>
          <ConfirmDialog
            summary={(
              <div className="o-thumb">
                <img className="o-thumb__img" src={deactivating.foto} alt="" />
                <div>
                  <p className="o-thumb__title">{deactivating.titulo}</p>
                  <p className="o-thumb__meta">{deactivating.ubicacion}</p>
                </div>
              </div>
            )}
            message="Dejará de aparecer en el catálogo de Atlantis. Sus negociaciones, comisiones y fotos se conservan, y puedes reactivarlo cuando quieras."
            confirmLabel="Desactivar inmueble"
            busyLabel="Desactivando…"
            onConfirm={handleDeactivate}
            onCancel={closeDeactivate}
          />
        </Modal>
      )}
    </>
  );

  return {
    notice,
    failure,
    create: start(() => setCreating(true)),
    edit: start(setEditing),
    deactivate: start(setDeactivating),
    reactivate,
    modals,
  };
}
