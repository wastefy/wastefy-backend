const { db } = require('../config/firebase');

const inventoryModel = {
    // Tambah item baru
    addItem: async (uid, data) => {
        const ref = await db.collection('inventory').add({
            ...data,
            uid,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        return ref.id;
    },

    // Ambil semua item milik user (belum diarsipkan)
    getAllItems: async (uid) => {
        const snapshot = await db
            .collection('inventory')
            .where('uid', '==', uid)
            .where('isArchived', '==', false)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Ambil item berdasarkan status
    getItemsByStatus: async (uid, status) => {
        const snapshot = await db
            .collection('inventory')
            .where('uid', '==', uid)
            .where('status', '==', status)
            .where('isArchived', '==', false)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Ambil item berdasarkan id
    getItemById: async (id) => {
        const doc = await db.collection('inventory').doc(id).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...doc.data() };
    },

    // Update item
    updateItem: async (id, data) => {
        await db.collection('inventory').doc(id).update({
            ...data,
            updatedAt: new Date().toISOString(),
        });
    },

    // Arsipkan item (pindah ke riwayat)
    archiveItem: async (id, action, sisaHari) => {
        await db.collection('inventory').doc(id).update({
            isArchived: true,
            archiveAction: action, // 'terpakai' atau 'buang'
            archivedAt: new Date().toISOString(),
            sisaHariSaatArsip: sisaHari || 0,
        });
    },

    // Ambil riwayat semua item
    getHistory: async (uid) => {
        const snapshot = await db
            .collection('inventory')
            .where('uid', '==', uid)
            .where('isArchived', '==', true)
            .orderBy('archivedAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Ambil riwayat berdasarkan action
    getHistoryByAction: async (uid, action) => {
        const snapshot = await db
            .collection('inventory')
            .where('uid', '==', uid)
            .where('isArchived', '==', true)
            .where('archiveAction', '==', action)
            .orderBy('archivedAt', 'desc')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Ambil item expiring soon
    getExpiringItems: async (uid) => {
        const snapshot = await db
            .collection('inventory')
            .where('uid', '==', uid)
            .where('isArchived', '==', false)
            .where('status', '==', 'Soon')
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Ambil semua item untuk refresh status
    getAllItemsForRefresh: async (uid) => {
        const snapshot = await db
            .collection('inventory')
            .where('uid', '==', uid)
            .where('isArchived', '==', false)
            .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    // Ambil summary
    getSummary: async (uid) => {
        const activeSnapshot = await db
            .collection('inventory')
            .where('uid', '==', uid)
            .where('isArchived', '==', false)
            .get();

        const historySnapshot = await db
            .collection('inventory')
            .where('uid', '==', uid)
            .where('isArchived', '==', true)
            .get();

        const activeItems = activeSnapshot.docs.map(doc => doc.data());
        const historyItems = historySnapshot.docs.map(doc => doc.data());

        return {
            total: activeItems.length,
            fresh: activeItems.filter(i => i.status === 'Fresh').length,
            soon: activeItems.filter(i => i.status === 'Soon').length,
            expired: activeItems.filter(i => i.status === 'Expired').length,
            terpakai: historyItems.filter(i => i.archiveAction === 'terpakai').length,
            terbuang: historyItems.filter(i => i.archiveAction === 'buang').length,
        };
    },

    // Hapus item permanen
    deleteItem: async (id) => {
        await db.collection('inventory').doc(id).delete();
    },
};

module.exports = inventoryModel;