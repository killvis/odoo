# -*- coding: utf-8 -*-
from odoo.addons.account.tests.common import AccountTestInvoicingCommon
from odoo.tests import tagged
import time

@tagged('post_install', '-at_install')
class TestTransferWizard(AccountTestInvoicingCommon):

    def setUp(self):
        super(TestTransferWizard, self).setUp()

        self.company = self.env.ref('base.main_company')
        self.receivable_account = self.env['account.account'].search([('user_type_id.type', '=', 'receivable'), ('company_id', '=', self.company.id)], limit=1)
        self.payable_account = self.env['account.account'].search([('user_type_id.type', '=', 'payable'), ('company_id', '=', self.company.id)], limit=1)
        self.accounts = self.env['account.account'].search([('reconcile', '=', False), ('company_id', '=', self.company.id)], limit=5)
        self.journal = self.env['account.journal'].search([('company_id', '=', self.company.id), ('type', '=', 'general')], limit=1)
        self.partners = self.env['res.partner'].search([], limit=2)

        # Set rate for base currency to 1
        self.env['res.currency.rate'].search([('company_id', '=', self.company.id), ('currency_id', '=', self.company.currency_id.id)]).write({'rate': 1})

        # Create test currencies
        self.test_currency_1 = self.env['res.currency'].create({
            'name': "PMK",
            'symbol':'P',
        })

        self.test_currency_2 = self.env['res.currency'].create({
            'name': "toto",
            'symbol':'To',
        })

        self.test_currency_3 = self.env['res.currency'].create({
            'name': "titi",
            'symbol':'Ti',
        })

        # Create test rates
        self.env['res.currency.rate'].create({
            'name': time.strftime('%Y') + '-' + '01' + '-01',
            'rate': 0.5,
            'currency_id': self.test_currency_1.id,
            'company_id': self.company.id
        })

        self.env['res.currency.rate'].create({
            'name': time.strftime('%Y') + '-' + '01' + '-01',
            'rate': 2,
            'currency_id': self.test_currency_2.id,
            'company_id': self.company.id
        })

        self.env['res.currency.rate'].create({
            'name': time.strftime('%Y') + '-' + '01' + '-01',
            'rate': 10,
            'currency_id': self.test_currency_3.id,
            'company_id': self.company.id
        })

        # Create an account using a foreign currency
        self.test_currency_account = self.env['account.account'].create({
            'name': 'test destination account',
            'code': 'test_dest_acc',
            'user_type_id': self.env['ir.model.data'].xmlid_to_res_id('account.data_account_type_current_assets'),
            'currency_id': self.test_currency_3.id,
        })

        # Create test account.move
        self.move_1 = self.env['account.move'].create({
            'journal_id': self.journal.id,
            'line_ids': [
                (0, 0, {
                    'name': "test1_1",
                    'account_id': self.receivable_account.id,
                    'debit': 500,
                }),
                (0, 0, {
                    'name': "test1_2",
                    'account_id': self.accounts[0].id,
                    'credit': 500,
                }),
                (0, 0, {
                    'name': "test1_3",
                    'account_id': self.accounts[0].id,
                    'debit': 800,
                    'partner_id': self.partners[0].id,
                }),
                (0, 0, {
                    'name': "test1_4",
                    'account_id': self.accounts[1].id,
                    'credit': 500,
                }),
                (0, 0, {
                    'name': "test1_5",
                    'account_id': self.accounts[2].id,
                    'credit': 300,
                    'partner_id': self.partners[0].id,
                }),
                (0, 0, {
                    'name': "test1_6",
                    'account_id': self.accounts[0].id,
                    'debit': 270,
                    'currency_id': self.test_currency_1.id,
                    'amount_currency': 540,
                }),
                (0, 0, {
                    'name': "test1_7",
                    'account_id': self.accounts[1].id,
                    'credit': 140,
                }),
                (0, 0, {
                    'name': "test1_8",
                    'account_id': self.accounts[2].id,
                    'credit': 160,
                }),
                (0, 0, {
                    'name': "test1_9",
                    'account_id': self.accounts[2].id,
                    'debit': 30,
                    'currency_id': self.test_currency_2.id,
                    'amount_currency': 15,
                }),
            ]
        })
        self.move_1.post()

        self.move_2 = self.env['account.move'].create({
            'journal_id': self.journal.id,
            'line_ids': [
                (0, 0, {
                    'name': "test2_1",
                    'account_id': self.accounts[1].id,
                    'debit': 400,
                }),
                (0, 0, {
                    'name': "test2_2",
                    'account_id': self.payable_account.id,
                    'credit': 400,
                }),
                (0, 0, {
                    'name': "test2_3",
                    'account_id': self.accounts[3].id,
                    'debit': 250,
                    'partner_id': self.partners[0].id,
                }),
                (0, 0, {
                    'name': "test2_4",
                    'account_id': self.accounts[1].id,
                    'debit': 480,
                    'partner_id': self.partners[1].id,
                }),
                (0, 0, {
                    'name': "test2_5",
                    'account_id': self.accounts[2].id,
                    'credit': 730,
                    'partner_id': self.partners[0].id,
                }),
                (0, 0, {
                    'name': "test2_6",
                    'account_id': self.accounts[2].id,
                    'credit': 412,
                    'partner_id': self.partners[0].id,
                    'currency_id': self.test_currency_2.id,
                    'amount_currency': -633,
                }),
                (0, 0, {
                    'name': "test2_7",
                    'account_id': self.accounts[1].id,
                    'debit': 572,
                }),
                (0, 0, {
                    'name': "test2_8",
                    'account_id': self.accounts[2].id,
                    'credit': 100,
                    'partner_id': self.partners[0].id,
                    'currency_id': self.test_currency_2.id,
                    'amount_currency': -123,
                }),
                (0, 0, {
                    'name': "test2_9",
                    'account_id': self.accounts[2].id,
                    'credit': 60,
                    'partner_id': self.partners[0].id,
                    'currency_id': self.test_currency_1.id,
                    'amount_currency': -10,
                }),
            ]
        })
        self.move_2.post()


    def test_transfer_wizard_reconcile(self):
        """ Tests reconciliation when doing a transfer with the wizard
        """
        wizard = self.env['account.transfer.wizard'].create({
            'move_line_ids': (self.move_1 + self.move_2).mapped('line_ids').filtered(lambda x: x.account_id.user_type_id.type in ('receivable', 'payable')),
            'destination_account_id': self.receivable_account.id,
            'journal_id': self.journal.id,
        })

        transfer_move_id = wizard.button_transfer()['res_id']
        transfer_move = self.env['account.move'].browse(transfer_move_id)

        payable_transfer = transfer_move.line_ids.filtered(lambda x: x.account_id == self.payable_account)
        receivable_transfer = transfer_move.line_ids.filtered(lambda x: x.account_id == self.receivable_account)

        self.assertTrue(payable_transfer.reconciled, "Payable line of the transfer move should be fully reconciled")
        self.assertAlmostEqual(self.move_1.line_ids.filtered(lambda x: x.account_id == self.receivable_account).amount_residual, 100, self.company.currency_id.decimal_places, "Receivable line of the original move should be partially reconciled, and still have a residual amount of 100 (500 - 400 from payable account)")
        self.assertTrue(self.move_2.line_ids.filtered(lambda x: x.account_id == self.payable_account).reconciled, "Payable line of the original move should be fully reconciled")
        self.assertAlmostEqual(receivable_transfer.amount_residual, 0, self.company.currency_id.decimal_places, "Receivable line from the transfer move should have nothing left to reconcile")
        self.assertAlmostEqual(payable_transfer.debit, 400, self.company.currency_id.decimal_places, "400 should have been debited from payable account to apply the transfer")
        self.assertAlmostEqual(receivable_transfer.credit, 400, self.company.currency_id.decimal_places, "400 should have been credited to receivable account to apply the transfer")


    def test_transfer_wizard_grouping(self):
        """ Tests grouping (by account and partner) when doing a transfer with the wizard
        """
        wizard = self.env['account.transfer.wizard'].create({
            'move_line_ids': (self.move_1 + self.move_2).mapped('line_ids').filtered(lambda x: x.name in ('test1_3', 'test1_4', 'test1_5', 'test2_3', 'test2_4', 'test2_5', 'test2_6', 'test2_8')),
            'destination_account_id': self.accounts[4].id,
            'journal_id': self.journal.id,
        })

        transfer_move_id = wizard.button_transfer()['res_id']
        transfer_move = self.env['account.move'].browse(transfer_move_id)

        groups = {}
        for line in transfer_move.line_ids:
            key = (line.account_id, line.partner_id or None, line.currency_id or None)
            self.assertFalse(groups.get(key), "There should be only one line per (account, partner, currency) group in the transfer move.")
            groups[key] = line

        self.assertAlmostEqual(groups[(self.accounts[0], self.partners[0], None)].balance, -800, self.company.currency_id.decimal_places)
        self.assertAlmostEqual(groups[(self.accounts[1], None, None)].balance, 500, self.company.currency_id.decimal_places)
        self.assertAlmostEqual(groups[(self.accounts[1], self.partners[1], None)].balance, -480, self.company.currency_id.decimal_places)
        self.assertAlmostEqual(groups[(self.accounts[2], self.partners[0], None)].balance, 1030, self.company.currency_id.decimal_places)
        self.assertAlmostEqual(groups[(self.accounts[2], self.partners[0], self.test_currency_2)].balance, 512, self.company.currency_id.decimal_places)
        self.assertAlmostEqual(groups[(self.accounts[3], self.partners[0], None)].balance, -250, self.company.currency_id.decimal_places)


    def test_transfer_wizard_currency_conversion(self):
        """ Tests multi currency use of the transfer wizard, checking the conversion
        is propperly done when using a destination account with a currency_id set.
        """
        wizard = self.env['account.transfer.wizard'].create({
            'move_line_ids': self.move_1.mapped('line_ids').filtered(lambda x: x.name in ('test1_6', 'test1_9')),
            'destination_account_id': self.test_currency_account.id,
            'journal_id': self.journal.id,
        })

        transfer_move_id = wizard.button_transfer()['res_id']
        transfer_move = self.env['account.move'].browse(transfer_move_id)

        destination_line = transfer_move.line_ids.filtered(lambda x: x.account_id == self.test_currency_account)
        self.assertEqual(destination_line.currency_id, self.test_currency_3, "Transferring to an account with a currency set should keep this currency on the transfer line.")
        self.assertAlmostEqual(destination_line.amount_currency, 3000, self.company.currency_id.decimal_places, "Transferring two lines with different currencies (and the same partner) on an account with a currency set should convert the balance of these lines into this account's currency (here (270 + 30) * 10 = 3000)")


    def test_transfer_wizard_no_currency_conversion(self):
        """ Tests multi currency use of the transfer wizard, verifying that
        currency amounts are kept on distinct lines when transferring to an
        account without any currency specified.
        """
        wizard = self.env['account.transfer.wizard'].create({
            'move_line_ids': self.move_2.mapped('line_ids').filtered(lambda x: x.name in ('test2_9', 'test2_6', 'test2_8')),
            'destination_account_id': self.receivable_account.id,
            'journal_id': self.journal.id,
        })

        transfer_move_id = wizard.button_transfer()['res_id']
        transfer_move = self.env['account.move'].browse(transfer_move_id)

        destination_lines = transfer_move.line_ids.filtered(lambda x: x.account_id == self.receivable_account)
        self.assertEqual(len(destination_lines), 2, "Two lines should have been created on destination account: one for each currency (the lines with same partner and currency should have been aggregated)")
        self.assertAlmostEqual(destination_lines.filtered(lambda x: x.currency_id == self.test_currency_1).amount_currency, -10, self.test_currency_1.decimal_places)
        self.assertAlmostEqual(destination_lines.filtered(lambda x: x.currency_id == self.test_currency_2).amount_currency, -756, self.test_currency_2.decimal_places)
