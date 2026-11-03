import { useState } from 'react';
import { Link } from 'react-router-dom';
import ActionMenu from '../components/ActionMenu';
import AsyncView from '../components/AsyncView';
import Icon from '../components/Icon';
import SelectField from '../components/SelectField';
import useAsync from '../hooks/useAsync';
import usePropertyActions from '../hooks/usePropertyActions';
import { formatArea, formatMoney, propertyStatus } from '../lib';
import { getMyProperties } from '../services/advisor';
import './PropertiesPage.css';

const STATUS_OPTIONS = [
  ['disponible', 'Disponible'],
  ['negociacion', 'En negociación'],
  ['vendido', 'Vendido'],
  ['alquilado', 'Alquilado'],
  ['inactivo', 'Inactivo'],
];

function PropertyCard({ property: p, onEdit, onDeactivate, onReactivate }) {
  const status = propertyStatus(p);
  return (
    <article className={`o-card c-prop ${p.activo === false ? 'is-inactive' : ''}`}>
      <div className="c-prop__media">
        <img className="c-prop__img" src={p.foto} alt="" />
        <span className={`o-badge o-badge--${status.key} c-prop__status`}>{status.label}</span>
        {p.tipo && <span className="c-prop__type">{p.tipo}</span>}
        <ActionMenu
          className="c-prop__menu"
          label={p.titulo}
          items={[
            { label: 'Editar', icon: 'edit', onSelect: onEdit },
            p.activo === false
              ? { label: 'Reactivar', icon: 'eye', onSelect: onReactivate }
              : { label: 'Desactivar', icon: 'eyeOff', onSelect: onDeactivate, danger: true },
          ]}
        />
      </div>
      <div className="c-prop__body">
        <ul className="c-prop__prices">
          {p.inmueble_modalidad.map((m) => (
            <li key={m.tipo_operacion}>
              <strong>{formatMoney(m.precio)}</strong>
              <span>{m.tipo_operacion === 'alquiler' ? '/mes · Alquiler' : 'Venta'}</span>
            </li>
          ))}
        </ul>
        {/* El enlace cubre toda la tarjeta (::after); el menú "···" queda por encima. */}
        <h2 className="c-prop__title"><Link className="c-prop__link" to={`/inmuebles/${p.id}`}>{p.titulo}</Link></h2>
        <p className="c-prop__place"><Icon name="pin" size={14} /> {p.ubicacion}</p>
        <ul className="c-prop__specs">
          {p.metros_cuadrados != null && <li><Icon name="area" size={14} /> {formatArea(p.metros_cuadrados)}</li>}
          {p.habitaciones != null && <li><Icon name="bed" size={14} /> {p.habitaciones} hab.</li>}
          {p['baños'] != null && <li><Icon name="bath" size={14} /> {p['baños']} baño{p['baños'] === 1 ? '' : 's'}</li>}
        </ul>
      </div>
    </article>
  );
}

export default function PropertiesPage({ user }) {
  const [version, setVersion] = useState(0); // sube tras guardar para volver a cargar la lista
  const state = useAsync(() => getMyProperties(user.id), [user.id, version]);
  const actions = usePropertyActions(user.id, () => setVersion((v) => v + 1));
  const [filters, setFilters] = useState({ tipo: '', estado: '', operacion: '', q: '' });
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));

  return (
    <>
      <AsyncView state={state}>
        {(properties) => {
          const q = filters.q.trim().toLowerCase();
          const visible = properties.filter((p) =>
            (!filters.tipo || p.tipo === filters.tipo) &&
            (!filters.estado || propertyStatus(p).key === filters.estado) &&
            (!filters.operacion || p.inmueble_modalidad.some((m) => m.tipo_operacion === filters.operacion)) &&
            (!q || p.titulo.toLowerCase().includes(q)));
          const types = [...new Set(properties.map((p) => p.tipo).filter(Boolean))].map((t) => [t, t]);

          return (
            <>
              <div className="o-page-head">
                <div>
                  <p className="o-eyebrow">Cartera</p>
                  <h1 className="o-title">Mis inmuebles<span className="o-count">{properties.length}</span></h1>
                </div>
                <button type="button" className="o-btn o-btn--lime" onClick={actions.create}>
                  <Icon name="plus" size={16} strokeWidth={2.5} /> Registrar inmueble
                </button>
              </div>
              {actions.notice && <p className="o-notice" role="status">{actions.notice}</p>}
              {actions.failure && <p className="o-error c-prop-failure" role="alert">{actions.failure}</p>}

              <div className="o-filters">
                <SelectField id="f-tipo" label="Tipo" value={filters.tipo} onChange={set('tipo')} options={types} placeholder="Todos" />
                <SelectField id="f-estado" label="Estado comercial" value={filters.estado} onChange={set('estado')} options={STATUS_OPTIONS} placeholder="Todos" />
                <SelectField id="f-op" label="Operación" value={filters.operacion} onChange={set('operacion')} options={[['venta', 'Venta'], ['alquiler', 'Alquiler']]} placeholder="Todos" />
                <div className="o-field">
                  <label className="o-field__label" htmlFor="f-q">Buscar</label>
                  <div className="o-field__control">
                    <input id="f-q" type="search" className="o-field__input" placeholder="Buscar inmueble por título" value={filters.q} onChange={(e) => set('q')(e.target.value)} />
                    <span className="o-field__icon"><Icon name="search" size={16} /></span>
                  </div>
                </div>
              </div>

              {visible.length ? (
                <div className="c-prop-grid">
                  {visible.map((p) => (
                    <PropertyCard
                      key={p.id}
                      property={p}
                      onEdit={() => actions.edit(p)}
                      onDeactivate={() => actions.deactivate(p)}
                      onReactivate={() => actions.reactivate(p)}
                    />
                  ))}
                </div>
              ) : <p className="o-card o-empty">{properties.length ? 'Ningún inmueble coincide con los filtros.' : 'Aún no tienes inmuebles captados.'}</p>}
            </>
          );
        }}
      </AsyncView>

      {actions.modals}
    </>
  );
}
