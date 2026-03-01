import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register fonts (Optional but recommended for professional look)
// Font.register({
//     family: 'Inter',
//     src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2'
// });

const styles = StyleSheet.create({
    page: {
        flexDirection: 'column',
        backgroundColor: '#FFFFFF',
        padding: 40,
        // fontFamily: 'Inter',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: '#4F46E5', // Indigo-600
        paddingBottom: 20,
        marginBottom: 30,
    },
    title: {
        fontSize: 24,
        fontWeight: 'extrabold',
        color: '#0F172A', // Slate-900
    },
    subtitle: {
        fontSize: 12,
        color: '#64748B', // Slate-500
        marginTop: 4,
    },
    logo: {
        width: 60,
        height: 60,
    },
    section: {
        marginBottom: 30,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4F46E5',
        marginBottom: 10,
        backgroundColor: '#EEF2FF', // Indigo-50
        padding: 8,
        borderRadius: 4,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 8,
    },
    label: {
        width: '30%',
        fontSize: 12,
        fontWeight: 'bold',
        color: '#475569',
    },
    value: {
        width: '70%',
        fontSize: 12,
        color: '#0F172A',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    statBox: {
        width: '30%',
        backgroundColor: '#F8FAFC', // Slate-50
        padding: 10,
        marginBottom: 15,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0', // Slate-200
        alignItems: 'center',
    },
    statName: {
        fontSize: 10,
        color: '#64748B',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#0F172A',
    },
    notesBox: {
        backgroundColor: '#F8FAFC',
        padding: 15,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        minHeight: 100,
    },
    notesText: {
        fontSize: 11,
        color: '#334155',
        lineHeight: 1.5,
    },
    footer: {
        position: 'absolute',
        bottom: 40,
        left: 40,
        right: 40,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#E2E8F0',
        paddingTop: 10,
    },
    footerText: {
        fontSize: 10,
        color: '#94A3B8',
    },
    signatureBlock: {
        alignItems: 'center',
        marginTop: 40,
        marginRight: 20,
        alignSelf: 'flex-end',
    },
    signatureLine: {
        width: 150,
        borderBottomWidth: 1,
        borderBottomColor: '#0F172A',
        marginBottom: 5,
    },
    signatureText: {
        fontSize: 10,
        color: '#64748B',
    }
});

interface ReportProps {
    studentName: string;
    category: string;
    term: string;
    date: string;
    metrics: {
        pace: number;
        shooting: number;
        passing: number;
        dribbling: number;
        defending: number;
        physical: number;
        discipline: number;
    };
    attendance: {
        total: number;
        present: number;
        percentage: string;
    };
    coachNotes: string;
    coachName: string;
}

export const StudentProgressReport = ({ data }: { data: ReportProps }) => (
    <Document>
        <Page size="A4" style={styles.page}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>INFORME DE PROGRESO</Text>
                    <Text style={styles.subtitle}>ACADEMIA OFICIAL - {data.term.toUpperCase()}</Text>
                </View>
                {/* Fallback to text if we don't have an absolute logo URL, image loading in react-pdf can be tricky with auth */}
                <View style={{ width: 50, height: 50, backgroundColor: '#4F46E5', borderRadius: 25, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold' }}>A</Text>
                </View>
            </View>

            {/* Student Info */}
            <View style={styles.section}>
                <View style={styles.row}>
                    <Text style={styles.label}>Jugador/a:</Text>
                    <Text style={styles.value}>{data.studentName}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Categoría/Equipo:</Text>
                    <Text style={styles.value}>{data.category}</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Fecha del Informe:</Text>
                    <Text style={styles.value}>{data.date}</Text>
                </View>
            </View>

            {/* Metrics Grid */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Métricas Deportivas (Escala 1-100)</Text>
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statName}>Ritmo</Text>
                        <Text style={styles.statValue}>{data.metrics.pace}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statName}>Tiro</Text>
                        <Text style={styles.statValue}>{data.metrics.shooting}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statName}>Pase</Text>
                        <Text style={styles.statValue}>{data.metrics.passing}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statName}>Regate</Text>
                        <Text style={styles.statValue}>{data.metrics.dribbling}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statName}>Defensa</Text>
                        <Text style={styles.statValue}>{data.metrics.defending}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statName}>Físico</Text>
                        <Text style={styles.statValue}>{data.metrics.physical}</Text>
                    </View>
                </View>
            </View>

            {/* Attendance & Discipline */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Actitud y Asistencia</Text>
                <View style={[styles.row, { marginTop: 10 }]}>
                    <Text style={styles.label}>Disciplina y Comportamiento:</Text>
                    <Text style={[styles.value, { fontWeight: 'bold' }]}>{data.metrics.discipline} / 100</Text>
                </View>
                <View style={styles.row}>
                    <Text style={styles.label}>Asistencia Trimestre:</Text>
                    <Text style={styles.value}>{data.attendance.present} de {data.attendance.total} sesiones ({data.attendance.percentage}%)</Text>
                </View>
            </View>

            {/* Coach Notes */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Observaciones del Entrenador</Text>
                <View style={styles.notesBox}>
                    <Text style={styles.notesText}>
                        {data.coachNotes || "Sin observaciones adicionales para este periodo."}
                    </Text>
                </View>
            </View>

            {/* Signature */}
            <View style={styles.signatureBlock}>
                <View style={styles.signatureLine}></View>
                <Text style={styles.signatureText}>Fdo: {data.coachName}</Text>
                <Text style={styles.signatureText}>Entrenador de la Academia</Text>
            </View>

            {/* Footer */}
            <View style={styles.footer}>
                <Text style={styles.footerText}>Generado de forma automatizada por Academy Web</Text>
                <Text style={styles.footerText}>Página 1 de 1</Text>
            </View>
        </Page>
    </Document>
);
