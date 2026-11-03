import { useState } from 'react';
import AsyncView from '../components/AsyncView';
import Chart from '../components/Chart';
import Icon from '../components/Icon';
import SelectField from '../components/SelectField';
import useAsync from '../hooks/useAsync';
import { formatDate, formatMoney, monthlySeries } from '../lib';
import { getMyDeals } from '../services/advisor';

const MONTH_NAMES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
// Eje con montos cortos ($5k); el tooltip lleva el monto completo.
const money = (v, short) => (short && v >= 1000 ? `$${Math.round(v / 1000)}k` : formatMoney(v));

// Periodos del selector: el año en curso y sus meses hasta hoy, del más reciente al más viejo.
// El valor es el prefijo de la fecha ("2026" o "2026-10") con el que se filtran las negociaciones cerradas.
function periodOptions(now = new Date()) {
  const year = now.getFullYear();
  const months = Array.from({ length: now.getMonth() + 1 }, (_, m) => [
    `${year}-${String(m + 1).padStart(2, '0')}`,
    `${MONTH_NAMES[m]} ${year}`,
  ]).reverse();
  return [[String(year), `Todo ${year}`], ...months];
}

export default function CommissionsPage({ user }) {
  const state = useAsync(() => getMyDeals(user.id), [user.id]);
  const options = periodOptions();
  const [period, setPeriod] = useState(options[0][0]);
  const periodLabel = options.find(([value]) => value === period)[1];

  return (
    <AsyncView state={state}>
      {(deals) => {
        const closed = deals.filter((d) => d.fecha);
        const rows = closed.filter((d) => d.fecha.startsWith(period));
        const total = rows.reduce((s, d) => s + d.comision, 0);
        const avgRate = rows.length ? rows.reduce((s, d) => s + d.porcentaje, 0) / rows.length : 0;

        return (
          <>
            <div className="o-page-head">
              <div>
                <p className="o-eyebrow">Finanzas</p>
                <h1 className="o-title">Mis comisiones generadas</h1>
              </div>
              <div className="c-period">
                <SelectField id="f-periodo" label="Periodo" value={period} onChange={setPeriod} options={options} />
              </div>
            </div>

            <div className="o-stack">
              <section className="o-grid o-grid--kpi" aria-label={`Resumen de ${periodLabel}`}>
                <article className="o-card o-kpi o-kpi--hero">
                  <span className="o-kpi__icon"><Icon name="trend" size={22} /></span>
                  <div>
                    <p className="o-kpi__label">Negociaciones cerradas</p>
                    <p className="o-kpi__value">{rows.length}</p>
                    <p className="o-kpi__hint">De <strong>{closed.length}</strong> en total</p>
                  </div>
                </article>
                <article className="o-card o-kpi">
                  <span className="o-kpi__icon"><Icon name="coins" size={22} /></span>
                  <div>
                    <p className="o-kpi__label">Comisiones del periodo</p>
                    <p className="o-kpi__value">{formatMoney(total)}</p>
                    <p className="o-kpi__hint">{periodLabel}</p>
                  </div>
                </article>
                <article className="o-card o-kpi">
                  <span className="o-kpi__icon"><Icon name="percent" size={22} /></span>
                  <div>
                    <p className="o-kpi__label">Tasa de comisión promedio</p>
                    <p className="o-kpi__value">{avgRate.toLocaleString('de-DE', { maximumFractionDigits: 1 })}%</p>
                    <p className="o-kpi__hint">De las cerradas en {periodLabel.toLowerCase()}</p>
                  </div>
                </article>
              </section>

              <section className="o-card">
                <div className="o-card__head">
                  <h2 className="o-card__title">Historial de ingresos mensuales</h2>
                  <span className="o-muted">Últimos 6 meses</span>
                </div>
                <Chart variant="bar" data={monthlySeries(closed, (d) => d.comision)} title="Comisiones cobradas por mes" format={money} />
              </section>

              <section className="o-card o-card--flush">
                <div className="o-card__head">
                  <h2 className="o-card__title">Desglose de comisiones</h2>
                  <span className="o-muted">{periodLabel}</span>
                </div>
                {rows.length ? (
                  <div className="o-table-wrap">
                    <table className="o-table">
                      <thead>
                        <tr><th>Fecha</th><th>Inmueble</th><th>Tipo</th><th className="is-num">Precio final</th><th className="is-num">Porcentaje</th><th className="is-num">Comisión</th></tr>
                      </thead>
                      <tbody>
                        {rows.map((d) => (
                          <tr key={d.id}>
                            <td className="o-muted">{formatDate(d.fecha)}</td>
                            <td className="is-strong">{d.inmueble?.titulo ?? 'Inmueble'}</td>
                            <td><span className={`o-badge o-badge--${d.operacion}`}>{d.operacion === 'alquiler' ? 'Alquiler' : 'Venta'}</span></td>
                            <td className="is-num">{formatMoney(d.precioFinal)}</td>
                            <td className="is-num">{d.porcentaje}%</td>
                            <td className="is-num is-strong">{formatMoney(d.comision)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="o-empty">No hay comisiones cerradas en {periodLabel.toLowerCase()}.</p>}
              </section>
            </div>
          </>
        );
      }}
    </AsyncView>
  );
}
