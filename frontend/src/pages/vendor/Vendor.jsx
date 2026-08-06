import { useState } from 'react'
import DataTableVendor from './DataTableVendor'
import FilterVendor from './FilterVendor'
import ButtonCreateVendor from '../../components/button/ButtonCreateVendor.jsx'
import DialogCreateVendor from '../../components/Dialog/DialogCreateVendor.jsx'
import CreateButton from '../../components/button/CreateButton.jsx'

const Vendor = ({ listData, onEdit, onDelete, saving, addForm, updateAddForm, handleAdd, search, setSearch }) => {
    const [open, setOpen] = useState(false)

    const onSubmit = async (e) => {
        await handleAdd(e)
        if (!saving) {
            setOpen(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', overflowY: 'hidden', height: '100%' }}>
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'white',
                    borderRadius: '16px',
                    border: '1.5px solid #e8edf4',
                    boxShadow: '0 4px 20px -2px rgba(148, 163, 184, 0.08)',
                    overflow: 'hidden',
                }}
            >
                <div style={{
                    background: 'white',
                    padding: '20px 24px',
                    borderBottom: '1.5px solid #e8edf4',
                    flexShrink: 0,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '10px',
                                background: '#e6f2f0',
                                display: 'grid',
                                placeItems: 'center',
                                color: '#1e5e4d',
                            }}>
                                <span className="material-icons-round" style={{ fontSize: '20px' }}>store</span>
                            </div>
                            <div>
                                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: '#1e293b' }}>
                                    Master Vendor
                                </h2>
                                <p style={{ margin: '1px 0 0', fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
                                    Kelola data vendor dan informasi rekening
                                </p>
                            </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <ButtonCreateVendor onClick={() => setOpen(true)} />
                        </div>
                    </div>
                    
                    <FilterVendor filters={{ search }} setFilters={(updater) => setSearch(typeof updater === 'function' ? updater({ search }).search : updater.search)} />
                </div>
                
                <DataTableVendor listData={listData} onEdit={onEdit} onDelete={onDelete} search={search} />
            </div>
            
            <DialogCreateVendor isOpen={open} eyebrow="Master Vendor" title="Tambah Vendor Baru" onClose={() => setOpen(false)}>
                <form onSubmit={onSubmit}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Nama Vendor / PT</label>
                            <input style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', background: '#f8fafc', color: '#1e293b' }} required value={addForm.name} onChange={e => updateAddForm('name', e.target.value)} placeholder="PT Contoh Maju" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Nama Bank Tujuan</label>
                            <input style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', background: '#f8fafc', color: '#1e293b' }} required value={addForm.bank} onChange={e => updateAddForm('bank', e.target.value)} placeholder="BCA a/n PT Contoh" />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '1rem' }}>
                            <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', color: '#64748b' }}>Nomor Rekening</label>
                            <input style={{ width: '100%', padding: '9px 12px', borderRadius: '10px', border: '1.5px solid #d7e0ea', background: '#f8fafc', color: '#1e293b' }} required value={addForm.no_rekening} onChange={e => updateAddForm('no_rekening', e.target.value)} placeholder="1234567890" />
                        </div>
                    </div>
                    <CreateButton type="submit" variant="accordion" tone="primary" disabled={saving} style={{ width: '100%', marginTop: '0.75rem', opacity: saving ? 0.7 : 1 }}>
                        <span className="material-icons-round" style={{ fontSize: '18px' }}>save</span>
                        {saving ? 'Menyimpan...' : 'Simpan Data'}
                    </CreateButton>
                </form>
            </DialogCreateVendor>
        </div>
    )
}

export default Vendor