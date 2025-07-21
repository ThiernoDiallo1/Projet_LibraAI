import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { paymentsApi } from '../services/api';
import { 
  CreditCard, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  XCircle,
  ExternalLink,
  History
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';

const PaymentPage: React.FC = () => {
  // const { user } = useAuth(); // Supprimé car non utilisé
  const queryClient = useQueryClient();
  const [paymentAmount, setPaymentAmount] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [showOverdueBorrowings, setShowOverdueBorrowings] = useState(false);

  // Récupérer le solde des amendes
  const { data: balance, isLoading: balanceLoading } = useQuery(
    'user-balance',
    () => paymentsApi.getUserBalance()
  );

  // Récupérer les emprunts en retard
  const { data: overdueBorrowings, isLoading: overdueLoading } = useQuery(
    'overdue-borrowings',
    () => paymentsApi.getOverdueBorrowings(),
    {
      enabled: showOverdueBorrowings
    }
  );

  // Récupérer l'historique des paiements
  const { data: paymentHistory, isLoading: historyLoading } = useQuery(
    'payment-history',
    () => paymentsApi.getPaymentHistory(),
    {
      enabled: showHistory
    }
  );

  // Mutation pour créer un paiement
  const createPaymentMutation = useMutation(
    (amount: number) => paymentsApi.createPayment(amount),
    {
      onSuccess: (data) => {
        if (data.success && data.approval_url) {
          // Rediriger vers PayPal
          window.location.href = data.approval_url;
        } else {
          toast.error('Erreur lors de la création du paiement');
        }
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.detail || 'Erreur lors du paiement');
      }
    }
  );

  // Gérer le retour de PayPal
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paymentId = urlParams.get('paymentId');
    const payerId = urlParams.get('PayerID');
    const token = urlParams.get('token');

    if (paymentId && payerId && token) {
      // Exécuter le paiement
      executePayment(paymentId, payerId);
    }
  }, []);

  const executePayment = async (paymentId: string, payerId: string) => {
    try {
      const result = await paymentsApi.executePayment(paymentId, payerId);
      if (result.success) {
        toast.success(`Paiement réussi ! Montant: ${result.amount_paid}€`);
        queryClient.invalidateQueries('user-balance');
        queryClient.invalidateQueries('payment-history');
        // Nettoyer l'URL
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'Erreur lors de l\'exécution du paiement');
    }
  };

  const handlePayment = () => {
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Veuillez entrer un montant valide');
      return;
    }

    if (amount > (balance?.fine_amount || 0)) {
      toast.error('Le montant ne peut pas dépasser vos amendes');
      return;
    }

    createPaymentMutation.mutate(amount);
  };

  const handlePayAll = () => {
    if (balance?.fine_amount && balance.fine_amount > 0) {
      createPaymentMutation.mutate(balance.fine_amount);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'created':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Terminé';
      case 'failed':
        return 'Échoué';
      case 'created':
        return 'En attente';
      default:
        return 'Inconnu';
    }
  };

  if (balanceLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const fineAmount = balance?.fine_amount || 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Paiement des amendes
        </h1>
        <p className="text-gray-600">
          Réglez vos amendes de bibliothèque via PayPal
        </p>
      </div>

      {/* Balance Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-3 rounded-full">
              <DollarSign className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Solde des amendes
              </h2>
              <p className="text-3xl font-bold text-red-600 mt-1">
                {fineAmount.toFixed(2)}€
              </p>
            </div>
          </div>
          
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="btn-outline flex items-center space-x-2"
          >
            <History className="h-4 w-4" />
            <span>Historique</span>
          </button>
        </div>

        {fineAmount > 0 ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <p className="text-yellow-800 text-sm">
                  Vous avez des amendes impayées. Veuillez les régler pour continuer à emprunter des livres.
                </p>
                <button
                  onClick={() => setShowOverdueBorrowings(!showOverdueBorrowings)}
                  className="text-yellow-800 hover:text-yellow-900 font-medium text-sm underline"
                >
                  {showOverdueBorrowings ? 'Masquer les détails' : 'Voir les détails'}
                </button>
              </div>
            </div>

            {/* Section des emprunts en retard */}
            {showOverdueBorrowings && (
              <div className="bg-white border rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Emprunts en retard
                </h3>
                {overdueLoading ? (
                  <div className="flex justify-center py-4">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : overdueBorrowings && overdueBorrowings.overdue_borrowings.length > 0 ? (
                  <div className="space-y-3">
                    {overdueBorrowings.overdue_borrowings.map((borrowing) => (
                      <div key={borrowing.id} className="border rounded-lg p-4 bg-red-50">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">
                              {borrowing.book_title}
                            </h4>
                            <p className="text-sm text-gray-600">
                              par {borrowing.book_author}
                            </p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <span>
                                Emprunté le : {formatDate(borrowing.borrowed_at)}
                              </span>
                              <span>
                                Échéance : {formatDate(borrowing.due_date)}
                              </span>
                              <span className="text-red-600 font-medium">
                                {borrowing.days_overdue} jour(s) de retard
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold text-red-600">
                              {borrowing.fine_amount.toFixed(2)}€
                            </p>
                            <p className="text-xs text-gray-500">Amende</p>
                          </div>
                        </div>
                      </div>
                    ))}
                    <div className="text-right pt-2 border-t">
                      <p className="text-sm text-gray-600">
                        Total : {overdueBorrowings.total_count} livre(s) en retard
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Aucun emprunt en retard trouvé
                  </p>
                )}
              </div>
            )}

            {/* Payment Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Custom Amount */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Paiement personnalisé
                </h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Montant à payer (€)
                  </label>
                  <input
                    type="number"
                    min="0.01"
                    max={fineAmount}
                    step="0.01"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="0.00"
                    className="input w-full"
                  />
                </div>
                <button
                  onClick={handlePayment}
                  disabled={createPaymentMutation.isLoading || !paymentAmount}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  {createPaymentMutation.isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Redirection...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Payer avec PayPal</span>
                      <ExternalLink className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Pay All */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Paiement total
                </h3>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">
                    Montant total des amendes
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {fineAmount.toFixed(2)}€
                  </p>
                </div>
                <button
                  onClick={handlePayAll}
                  disabled={createPaymentMutation.isLoading}
                  className="btn-primary w-full flex items-center justify-center space-x-2"
                >
                  {createPaymentMutation.isLoading ? (
                    <>
                      <LoadingSpinner size="sm" />
                      <span>Redirection...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4" />
                      <span>Tout payer avec PayPal</span>
                      <ExternalLink className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Aucune amende à payer
            </h3>
            <p className="text-gray-600">
              Vous n'avez actuellement aucune amende impayée.
            </p>
          </div>
        )}
      </div>

      {/* Payment History */}
      {showHistory && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Historique des paiements
          </h2>

          {historyLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" />
            </div>
          ) : paymentHistory?.payments.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Aucun paiement effectué</p>
            </div>
          ) : (
            <div className="space-y-4">
              {paymentHistory?.payments.map((payment: any) => (
                <div
                  key={payment._id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(payment.status)}
                      <div>
                        <p className="font-medium text-gray-900">
                          {payment.amount.toFixed(2)}€
                        </p>
                        <p className="text-sm text-gray-600">
                          {payment.description}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {getStatusText(payment.status)}
                      </p>
                      <p className="text-sm text-gray-600">
                        {formatDate(payment.created_at)}
                      </p>
                    </div>
                  </div>
                  
                  {payment.payment_id && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500">
                        ID: {payment.payment_id}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PayPal Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
          <div>
            <h3 className="text-sm font-medium text-blue-900 mb-1">
              Paiement sécurisé avec PayPal
            </h3>
            <p className="text-sm text-blue-700">
              Vos paiements sont traités de manière sécurisée par PayPal. 
              Vous serez redirigé vers PayPal pour finaliser votre paiement.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage;