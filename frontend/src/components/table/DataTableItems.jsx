import React from "react";

import { useNavigate } from "react-router-dom";


exports.TableItems = ({items}) => {
    return (
        <Table striped bordered hover>
            <thead>
                <tr>
                    <th>No</th>
                    <th>FRP Number</th>
                    <th>Description</th>
                    <th>Amount</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => (
                    <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{item.frpNo}</td>
                        <td>{item.description}</td>
                        <td>{item.amount}</td>
                        <td>
                            <Button variant="primary" onClick={() => navigate(`/frp/${item.id}`)}>View</Button>
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    )
}

    