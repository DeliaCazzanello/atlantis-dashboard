import { Fragment, useEffect, useRef, useState } from 'react';
import SelectField from './SelectField';
import Icon from './Icon';
import OwnerField from './OwnerField';
import LocationField from './LocationField';
import { COMMERCIAL_STATES, LEGAL_STATUSES, PROPERTY_TYPES } from '../lib';
import './PropertyForm.css';

// Formulario de inmuebles de atlantis-web, adaptado al panel. Va dentro de <Modal>.
// Operación del formulario → filas de inmueble_modalidad (tipo_operacion = 'venta' | 'alquiler').
const OPERATIONS = [
  ['venta', 'Venta'],
  ['alquiler', 'Alquiler'],
  ['ambos', 'Venta y alquiler'],
];
const OPERATION_KEYS = { venta: ['venta'], alquiler: ['alquiler'], ambos: ['venta', 'alquiler'] };
const PRICE_LABEL = { venta: 'Precio de venta ($)', alquiler: 'Precio de alquiler ($/mes)' };

const METROS_MAX = 99999999.99; // metros_cuadrados es numeric(10, 2)
const EMPTY = {
  titulo: '', tipo: PROPERTY_TYPES[0], operacion: 'venta', precioVenta: '', precioAlquiler: '',
  estadoVenta: 'Disponible', estadoAlquiler: 'Disponible', estatusLegal: LEGAL_STATUSES[0],
  metros: '', habitaciones: '', banos: '', ubicacion: '', descripcion: '', propietario: null,
};

const digits = (value) => value.replace(/\D/g, '');
// Número con coma decimal y hasta dos decimales: "85,5". Un punto se toma como coma (teclados sin coma).
const decimal = (value) => value.replace(/\./g, ',').replace(/[^\d,]/g, '').match(/^\d*(,\d{0,2})?/)[0];
const toNumber = (value) => Number(value.replace(',', '.'));
const money = (value) => (value ? Number(value).toLocaleString('de-DE') : '');
const priceKey = (op) => (op === 'venta' ? 'precioVenta' : 'precioAlquiler');
const stateKey = (op) => (op === 'venta' ? 'estadoVenta' : 'estadoAlquiler');
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const isLocalPreview = (url) => url.startsWith('blob:'); // vistas previas creadas aquí; las fotos guardadas no se liberan

// Inmueble de getMyProperties → valores del formulario (para editar).
export function propertyToForm(p) {
  const modalidad = (op) => p.inmueble_modalidad.find((m) => m.tipo_operacion === op);
  const text = (v) => (v == null ? '' : String(v));
  const venta = modalidad('venta')?.precio;
  const alquiler = modalidad('alquiler')?.precio;
  return {
    values: {
      titulo: p.titulo ?? '',
      tipo: p.tipo ?? PROPERTY_TYPES[0],
      operacion: venta != null && alquiler != null ? 'ambos' : (alquiler != null ? 'alquiler' : 'venta'),
      precioVenta: text(venta),
      precioAlquiler: text(alquiler),
      estadoVenta: modalidad('venta')?.estado_comercial || 'Disponible',
      estadoAlquiler: modalidad('alquiler')?.estado_comercial || 'Disponible',
      estatusLegal: p.estatus_legal ?? '',
      propietario: p.propietario ?? null,
      metros: text(p.metros_cuadrados).replace('.', ','),
      habitaciones: text(p.habitaciones),
      banos: text(p['baños']),
      ubicacion: p.ubicacion ?? '',
      descripcion: p.descripcion ?? '',
    },
    images: p.imagenes.map((url) => ({ url, file: null })),
  };
}

// Validación en el navegador para avisar rápido; la base valida tipos y nulos.
function validate(form) {
  if (!form.titulo.trim()) return 'Escribe un título para el inmueble.';
  if (!form.ubicacion.trim()) return 'Escribe la ubicación.';
  if (!form.estatusLegal.trim()) return 'Escribe el estatus legal del inmueble.';
  if (!form.propietario) return 'Elige el propietario del inmueble o registra uno nuevo.';
  const metros = toNumber(form.metros);
  if (form.metros && (!metros || metros > METROS_MAX)) return 'Revisa los metros cuadrados (un número mayor que 0).';
  if (Number(form.habitaciones) > 50 || Number(form.banos) > 50) return 'Revisa la cantidad de habitaciones y baños.';
  const missing = OPERATION_KEYS[form.operacion].find((op) => !Number(form[priceKey(op)]));
  if (missing) return `Escribe el ${PRICE_LABEL[missing].toLowerCase().replace(/ \(.*\)/, '')}.`;
  return '';
}

// Datos del formulario → forma de las tablas inmueble e inmueble_modalidad.
// propietario va como ficha ({ id?, nombre, correo, telefono }): quien guarda la registra y usa su id.
function toPayload(form, images) {
  const optional = (v) => (v === '' ? null : Number(v));
  return {
    titulo: form.titulo.trim(),
    descripcion: form.descripcion.trim(),
    tipo: form.tipo,
    metros_cuadrados: form.metros ? toNumber(form.metros) : null,
    habitaciones: optional(form.habitaciones),
    baños: optional(form.banos),
    ubicacion: form.ubicacion.trim(),
    estatus_legal: form.estatusLegal.trim(),
    propietario: form.propietario,
    // Archivos nuevos por comprimir y subir, y URLs de fotos que ya estaban guardadas.
    fotos: images.map((img) => img.file ?? img.url),
    modalidades: OPERATION_KEYS[form.operacion].map((op) => ({
      tipo_operacion: op,
      precio: Number(form[priceKey(op)]),
      estado_comercial: form[stateKey(op)],
    })),
  };
}

function Section({ icon, title, children }) {
  return (
    <fieldset className="c-property-form__section">
      <legend className="c-property-form__legend"><Icon name={icon} size={15} /> {title}</legend>
      <div className="c-property-form__grid">{children}</div>
    </fieldset>
  );
}

// initial: { values, images } de propertyToForm para editar; sin él, formulario vacío para registrar.
// onSubmit(payload) devuelve una promesa; si falla, el formulario muestra el error y sigue abierto.
export default function PropertyForm({ initial, submitLabel = 'Registrar inmueble', onSubmit, onCancel }) {
  const [form, setForm] = useState(initial?.values ?? EMPTY);
  const [images, setImages] = useState(initial?.images ?? []); // { file, url }; file null = foto ya guardada
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const set = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  // Libera las vistas previas que sigan abiertas al cerrar el formulario (las quitadas se liberan al quitarlas).
  const imagesRef = useRef(images);
  imagesRef.current = images;
  useEffect(() => () => imagesRef.current.filter((img) => isLocalPreview(img.url)).forEach((img) => URL.revokeObjectURL(img.url)), []);

  // Desde el selector o arrastradas: un drop salta el accept del input, por eso se filtra por tipo.
  function addFiles(fileList) {
    const files = [...fileList].filter((f) => PHOTO_TYPES.includes(f.type));
    setImages((list) => [...list, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  function addImages(e) {
    addFiles(e.target.files);
    e.target.value = ''; // permite volver a elegir el mismo archivo
  }

  // Ctrl+V en cualquier parte del formulario: si el portapapeles trae imágenes se agregan; el texto se pega normal.
  function pasteImages(e) {
    if (![...e.clipboardData.files].some((f) => PHOTO_TYPES.includes(f.type))) return;
    e.preventDefault();
    addFiles(e.clipboardData.files);
  }

  const [dragging, setDragging] = useState(false);
  const dropZone = {
    onDragOver: (e) => { e.preventDefault(); setDragging(true); },
    // Solo al salir de la zona, no al pasar sobre una foto de adentro.
    onDragLeave: (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); },
    onDrop: (e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); },
  };

  function removeImage(url) {
    if (isLocalPreview(url)) URL.revokeObjectURL(url);
    setImages((list) => list.filter((img) => img.url !== url));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const problem = validate(form);
    setError(problem);
    if (problem) return;
    setSending(true);
    try {
      await onSubmit(toPayload(form, images));
    } catch (err) {
      setError(err.userMessage ?? 'No se pudo guardar el inmueble. Revisa tu conexión e intenta de nuevo.');
      setSending(false);
    }
  }

  const textField = (name, label, placeholder, props = {}) => (
    <div className={`o-field ${props.wide ? 'c-property-form__wide' : ''}`}>
      <label className="o-field__label" htmlFor={`property-${name}`}>{label}</label>
      <input
        id={`property-${name}`}
        className="o-field__input"
        placeholder={placeholder}
        list={props.list}
        value={form[name]}
        onChange={(e) => set(name, e.target.value)}
      />
    </div>
  );

  const numberField = (name, label, placeholder, suffix, parse = digits) => (
    <div className="o-field">
      <label className="o-field__label" htmlFor={`property-${name}`}>{label}</label>
      <div className="o-field__control">
        <input
          id={`property-${name}`}
          className="o-field__input"
          inputMode={parse === decimal ? 'decimal' : 'numeric'}
          placeholder={placeholder}
          value={form[name]}
          onChange={(e) => set(name, parse(e.target.value))}
        />
        {suffix && <span className="o-field__icon c-property-form__suffix">{suffix}</span>}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} onPaste={pasteImages} noValidate>
      <div className="c-modal__body c-property-form">
        <Section icon="home" title="Datos generales">
          {textField('titulo', 'Título', 'Casa en Alta Vista con piscina', { wide: true })}
          <SelectField
            id="property-tipo"
            label="Tipo de propiedad"
            options={PROPERTY_TYPES.map((t) => [t, t])}
            value={form.tipo}
            onChange={(v) => set('tipo', v)}
          />
          <LocationField id="property-ubicacion" value={form.ubicacion} onChange={(v) => set('ubicacion', v)} />
          {textField('estatusLegal', 'Estatus legal', 'Documentos en regla', { list: 'property-estatus' })}
          <datalist id="property-estatus">
            {LEGAL_STATUSES.map((e) => <option key={e} value={e} />)}
          </datalist>
        </Section>

        <Section icon="users" title="Propietario">
          <div className="c-property-form__wide">
            <OwnerField value={form.propietario} onChange={(owner) => set('propietario', owner)} />
          </div>
        </Section>

        <Section icon="coins" title="Operación y precio">
          <div className="o-field c-property-form__wide">
            <span className="o-field__label" id="property-operacion-label">Operación</span>
            <div className="c-segmented" role="radiogroup" aria-labelledby="property-operacion-label">
              {OPERATIONS.map(([value, label]) => (
                <label key={value} className={`c-segmented__option ${form.operacion === value ? 'is-active' : ''}`}>
                  <input
                    type="radio"
                    name="operacion"
                    className="u-sr-only"
                    value={value}
                    checked={form.operacion === value}
                    onChange={() => set('operacion', value)}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
          {OPERATION_KEYS[form.operacion].map((op) => (
            <Fragment key={op}>
              <div className="o-field">
                <label className="o-field__label" htmlFor={`property-${priceKey(op)}`}>{PRICE_LABEL[op]}</label>
                <div className="o-field__control">
                  <span className="c-property-form__prefix" aria-hidden="true">$</span>
                  <input
                    id={`property-${priceKey(op)}`}
                    className="o-field__input c-property-form__money"
                    inputMode="numeric"
                    placeholder={op === 'venta' ? '100.000' : '500'}
                    value={money(form[priceKey(op)])}
                    onChange={(e) => set(priceKey(op), digits(e.target.value))}
                  />
                </div>
              </div>
              <SelectField
                id={`property-${stateKey(op)}`}
                label={op === 'venta' ? 'Estado de la venta' : 'Estado del alquiler'}
                // Un estado escrito por otro módulo que no esté en la lista se conserva como opción.
                options={[...new Set([...COMMERCIAL_STATES[op], form[stateKey(op)]])].map((e) => [e, e])}
                value={form[stateKey(op)]}
                onChange={(v) => set(stateKey(op), v)}
              />
            </Fragment>
          ))}
        </Section>

        <Section icon="area" title="Características">
          <div className="c-property-form__trio c-property-form__wide">
            {numberField('metros', 'Metros cuadrados (opcional)', '1250,50', 'm²', decimal)}
            {numberField('habitaciones', 'Habitaciones', 'Opcional')}
            {numberField('banos', 'Baños', 'Opcional')}
          </div>
          <div className="o-field c-property-form__wide">
            <label className="o-field__label" htmlFor="property-descripcion">Descripción</label>
            <textarea
              id="property-descripcion"
              className="o-field__input c-property-form__textarea"
              placeholder="Cuenta con piscina, tres puestos de estacionamiento y vigilancia 24 horas."
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
            />
          </div>
        </Section>

        <Section icon="image" title="Fotos">
          <div className="c-property-form__wide">
            <ul
              className={`c-property-form__photos ${dragging ? 'is-dragging' : ''}`}
              aria-label="Fotos del inmueble"
              {...dropZone}
            >
              {images.map((img, i) => (
                <li key={img.url} className="c-property-form__photo">
                  <img src={img.url} alt={`Foto ${i + 1}`} />
                  {i === 0 && <span className="c-property-form__cover">Portada</span>}
                  <button
                    type="button"
                    className="c-property-form__remove"
                    onClick={() => removeImage(img.url)}
                    aria-label={`Quitar foto ${i + 1}`}
                  >
                    <Icon name="close" size={12} strokeWidth={3} />
                  </button>
                </li>
              ))}
              <li>
                <label className="c-property-form__add">
                  <input type="file" accept={PHOTO_TYPES.join(',')} multiple className="u-sr-only" onChange={addImages} />
                  <Icon name="plus" size={18} />
                  Agregar
                </label>
              </li>
            </ul>
            <p className="c-property-form__hint">Arrastra las fotos aquí, pégalas con Ctrl+V o haz clic en Agregar. JPG, PNG o WebP; se comprimen al guardar y la primera es la portada.</p>
          </div>
        </Section>

        {error && <p className="o-error" role="alert">{error}</p>}
      </div>

      <div className="c-modal__foot">
        <button type="button" className="o-btn o-btn--ghost" onClick={onCancel}>Cancelar</button>
        <button type="submit" className="o-btn o-btn--lime" disabled={sending}>
          {sending ? 'Guardando…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
